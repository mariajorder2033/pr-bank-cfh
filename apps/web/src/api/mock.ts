/**
 * In-browser demo backend implementing the customer API contract. It runs the real domain
 * ledger, so transfers move money, balances are derived from entries, and corrections show up
 * as reversal + replacement (ADR 0002). State lives in memory and resets on reload.
 *
 * Replaced by HTTP clients for the services once the identity provider is chosen and the
 * app can obtain access tokens.
 */

import {
  approve,
  buildSwissIban,
  formatAmount,
  getTransactionType,
  Ledger,
  negate,
  parseAmount,
  requestApproval,
  validateIban,
  type CurrencyCode,
  type Money,
  type Transaction as LedgerTransaction,
  type TransactionTypeCode,
} from '@pr-bank/domain';
import {
  ApiError,
  type Account,
  type Backend,
  type Card,
  type MoneyDto,
  type Session,
  type Transaction,
  type TransactionQuery,
  type Transfer,
  type TransferRequest,
} from './types';

/** Demo clearing number (IID); IBANs built with it are recognised as this bank's. */
export const DEMO_IID = '00000';
/** Transfers above this need a step-up MFA token (FR-12, admin-configurable in production). */
export const STEP_UP_THRESHOLD = parseAmount('1000', 'CHF');
/** How long a simulated domestic transfer stays pending before it settles. */
export const DOMESTIC_SETTLEMENT_MS = 4000;
const STEP_UP_TTL_MS = 5 * 60_000;

interface AccountRecord {
  id: string;
  type: Account['type'];
  name: string;
  iban: string;
  currency: CurrencyCode;
}

interface TransferRecord {
  transfer: Transfer;
  entryId: string;
  settlesAt: number | null;
}

export interface MockBackendOptions {
  now?: () => Date;
  /** Artificial delay per call, so loading states are visible in the demo. */
  latencyMs?: number;
}

export function createMockBackend({
  now = () => new Date(),
  latencyMs = 0,
}: MockBackendOptions = {}): Backend {
  const ledger = new Ledger();
  const accounts = new Map<string, AccountRecord>();
  const cards = new Map<string, Card>();
  const transfers = new Map<string, TransferRecord>();
  const idempotency = new Map<string, { fingerprint: string; transferId: string }>();
  const stepUpTokens = new Map<string, number>();
  let session: Session | null = null;
  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${(++sequence).toString().padStart(4, '0')}`;

  seed();

  async function call<T>(fn: () => T): Promise<T> {
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    if (!session) {
      throw new ApiError(401, 'unauthorized', 'Please sign in again.');
    }
    settleDueTransfers();
    return fn();
  }

  function settleDueTransfers(): void {
    const at = now().getTime();
    for (const record of transfers.values()) {
      if (record.settlesAt !== null && record.settlesAt <= at) {
        ledger.transition(record.entryId, 'processing');
        ledger.transition(record.entryId, 'completed');
        record.transfer = {
          ...record.transfer,
          status: 'completed',
          updatedAt: now().toISOString(),
        };
        record.settlesAt = null;
      }
    }
  }

  function ownAccount(id: string): AccountRecord | undefined {
    return accounts.get(id);
  }

  function toAccount(record: AccountRecord): Account {
    return {
      ...record,
      status: 'active',
      bookedBalance: toMoney(ledger.bookedBalance(record.id)),
      availableBalance: toMoney(ledger.availableBalance(record.id)),
    };
  }

  function createTransfer(
    request: TransferRequest,
    { idempotencyKey, stepUpToken }: { idempotencyKey: string; stepUpToken?: string },
  ): Transfer {
    if (idempotencyKey.length < 16) {
      throw new ApiError(400, 'bad_request', 'Idempotency-Key must be at least 16 characters.');
    }
    const fingerprint = JSON.stringify(request);
    const seen = idempotency.get(idempotencyKey);
    if (seen) {
      if (seen.fingerprint !== fingerprint) {
        throw new ApiError(
          409,
          'idempotency_conflict',
          'This request was already sent with different details.',
        );
      }
      return requireTransfer(seen.transferId).transfer;
    }

    const from = ownAccount(request.fromAccountId);
    if (!from) {
      throw new ApiError(400, 'invalid_account', 'Choose one of your accounts to pay from.');
    }
    if (request.amount.currency !== from.currency) {
      throw new ApiError(400, 'currency_mismatch', `This account is in ${from.currency}.`);
    }
    let amount: Money;
    try {
      amount = parseAmount(request.amount.amount, from.currency);
    } catch {
      throw new ApiError(400, 'invalid_amount', 'Enter an amount with at most two decimals.');
    }
    if (amount.amountMinor <= 0n) {
      throw new ApiError(400, 'invalid_amount', 'Enter an amount greater than zero.');
    }
    if (amount.amountMinor > ledger.availableBalance(from.id).amountMinor) {
      throw new ApiError(
        400,
        'insufficient_funds',
        'The amount is more than your available balance.',
      );
    }
    if (amount.amountMinor > STEP_UP_THRESHOLD.amountMinor && !isValidStepUp(stepUpToken)) {
      throw new ApiError(403, 'step_up_required', 'Confirm this transfer with your security code.');
    }
    if ((request.reference?.length ?? 0) > 140) {
      throw new ApiError(400, 'bad_request', 'The reference can be at most 140 characters.');
    }

    const createdAt = now().toISOString();
    const id = nextId('trf');
    const referenceId = `TRF${createdAt.slice(0, 10).replaceAll('-', '')}${sequence.toString().padStart(4, '0')}`;
    const debitId = `${id}-debit`;
    const destination = request.destination;
    let record: TransferRecord;

    if (destination.kind === 'own_account') {
      const to = ownAccount(destination.accountId);
      if (!to || to.id === from.id || to.currency !== from.currency) {
        throw new ApiError(
          400,
          'invalid_destination',
          'Choose a different account of yours in the same currency.',
        );
      }
      const entry = {
        type: 'TXN-01',
        timestamp: createdAt,
        referenceId,
        status: 'completed',
      } as const;
      ledger.record({
        ...entry,
        id: debitId,
        accountId: from.id,
        amount: negate(amount),
        description: `Transfer to ${to.name}`,
      });
      ledger.record({
        ...entry,
        id: `${id}-credit`,
        accountId: to.id,
        amount,
        description: `Transfer from ${from.name}`,
      });
      record = {
        transfer: { id, status: 'completed', referenceId, createdAt, updatedAt: createdAt },
        entryId: debitId,
        settlesAt: null,
      };
    } else {
      const validation = validateIban(destination.iban);
      if (!validation.valid) {
        throw new ApiError(400, 'invalid_iban', 'This IBAN is not valid. Check it and try again.');
      }
      if ([...accounts.values()].some((account) => account.iban === validation.iban)) {
        throw new ApiError(
          400,
          'invalid_destination',
          'This is one of your own accounts. Use an own-account transfer.',
        );
      }
      const creditorName = destination.creditorName.trim();
      if (!creditorName || creditorName.length > 70) {
        throw new ApiError(
          400,
          'bad_request',
          "Enter the beneficiary's name (up to 70 characters).",
        );
      }
      const sameBank = validation.iban.startsWith('CH') && validation.iban.slice(4, 9) === DEMO_IID;
      ledger.record({
        id: debitId,
        accountId: from.id,
        type: sameBank ? 'TXN-02' : 'TXN-03',
        amount: negate(amount),
        timestamp: createdAt,
        referenceId,
        description: creditorName,
      });
      record = {
        transfer: { id, status: 'pending', referenceId, createdAt, updatedAt: createdAt },
        entryId: debitId,
        settlesAt: now().getTime() + DOMESTIC_SETTLEMENT_MS,
      };
    }

    transfers.set(id, record);
    idempotency.set(idempotencyKey, { fingerprint, transferId: id });
    return record.transfer;
  }

  function requireTransfer(id: string): TransferRecord {
    const record = transfers.get(id);
    if (!record) {
      throw new ApiError(404, 'not_found', 'Not found');
    }
    return record;
  }

  function requireCard(id: string): Card {
    const card = cards.get(id);
    if (!card) {
      throw new ApiError(404, 'not_found', 'Not found');
    }
    return card;
  }

  function setCardStatus(id: string, from: Card['status'], to: Card['status']): Card {
    const card = requireCard(id);
    const next = card.status === from ? { ...card, status: to } : card;
    cards.set(id, next);
    return next;
  }

  function isValidStepUp(token: string | undefined): boolean {
    const expiresAt = token === undefined ? undefined : stepUpTokens.get(token);
    return expiresAt !== undefined && expiresAt > now().getTime();
  }

  function seed(): void {
    const iso = (daysAgo: number, hour = 9, minute = 0) => {
      const date = new Date(now());
      date.setUTCDate(date.getUTCDate() - daysAgo);
      date.setUTCHours(hour, minute, 0, 0);
      return date.toISOString();
    };
    const open = (record: AccountRecord) => {
      accounts.set(record.id, record);
      ledger.openAccount({ id: record.id, currency: record.currency });
    };
    open({
      id: 'acc-current',
      type: 'current',
      name: 'Private account',
      iban: buildSwissIban(DEMO_IID, '100200300'),
      currency: 'CHF',
    });
    open({
      id: 'acc-savings',
      type: 'savings',
      name: 'Savings account',
      iban: buildSwissIban(DEMO_IID, '100200301'),
      currency: 'CHF',
    });

    const book = (
      accountId: string,
      type: TransactionTypeCode,
      amount: string,
      daysAgo: number,
      description: string,
      category: string | null,
      status: 'completed' | 'pending' = 'completed',
    ): LedgerTransaction => {
      const id = nextId('txn');
      return ledger.record({
        id,
        accountId,
        type,
        amount: parseAmount(amount, 'CHF'),
        status,
        timestamp:
          daysAgo === 0
            ? new Date(now().getTime() - 2 * 3_600_000).toISOString()
            : iso(daysAgo, 8 + (daysAgo % 9)),
        referenceId: `REF${id.slice(4)}`,
        description,
        category,
      });
    };

    book('acc-savings', 'TXN-30', '15000.00', 45, 'Incoming transfer — A. Muster', 'Income');
    book('acc-current', 'TXN-30', '2400.00', 40, 'Incoming transfer — A. Muster', 'Income');
    book('acc-current', 'TXN-29', '6500.00', 28, 'Salary — Example Employer AG', 'Income');
    book('acc-current', 'TXN-11', '-2150.00', 27, 'Rent — standing order', 'Housing');
    book('acc-current', 'TXN-01', '-500.00', 26, 'Transfer to Savings account', null);
    book('acc-savings', 'TXN-01', '500.00', 26, 'Transfer from Private account', null);
    book('acc-current', 'TXN-16', '-86.40', 24, 'Grocery store', 'Groceries');
    book('acc-current', 'TXN-18', '-200.00', 21, 'ATM withdrawal — Zürich HB', 'Cash');
    book('acc-current', 'TXN-17', '-129.90', 18, 'Online electronics shop', 'Shopping');
    book('acc-current', 'TXN-20', '29.90', 15, 'Refund — online electronics shop', 'Shopping');
    const bill = book(
      'acc-current',
      'TXN-10',
      '-120.00',
      12,
      'City Utilities — electricity',
      'Utilities',
    );
    book('acc-current', 'TXN-16', '-64.20', 9, 'Restaurant', 'Dining');
    book('acc-current', 'TXN-27', '-5.00', 6, 'Account fee', 'Fees');
    book('acc-current', 'TXN-16', '-42.50', 3, 'Bakery', 'Dining');
    book('acc-savings', 'TXN-26', '3.12', 1, 'Interest', 'Interest');
    book('acc-current', 'TXN-16', '-18.60', 0, 'Coffee shop', 'Dining', 'pending');

    // The utility bill was booked at 120.00 instead of 94.35 and corrected under four-eyes approval.
    const correction = requestApproval({
      id: 'COR-0001',
      makerId: 'ops-1',
      justification: 'Biller confirmed the invoice amount was CHF 94.35',
      payload: {
        transactionId: bill.id,
        reversalId: nextId('txn'),
        timestamp: iso(10),
        replacement: { id: nextId('txn'), amount: parseAmount('-94.35', 'CHF') },
      },
    });
    ledger.correct(approve(correction, 'ops-2', iso(10)));

    cards.set('card-debit', {
      id: 'card-debit',
      accountId: 'acc-current',
      maskedPan: '•••• 4821',
      brand: 'visa',
      expiry: '08/29',
      status: 'active',
      virtual: false,
    });
    cards.set('card-virtual', {
      id: 'card-virtual',
      accountId: 'acc-current',
      maskedPan: '•••• 1937',
      brand: 'mastercard',
      expiry: '03/30',
      status: 'active',
      virtual: true,
    });
  }

  return {
    api: {
      listAccounts: () => call(() => [...accounts.values()].map(toAccount)),
      listTransactions: (accountId: string, query: TransactionQuery = {}) =>
        call(() => {
          if (!ownAccount(accountId)) {
            throw new ApiError(404, 'not_found', 'Not found');
          }
          const limit = query.limit ?? 50;
          if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
            throw new ApiError(400, 'bad_request', 'limit must be between 1 and 200');
          }
          const fromMs = query.from ? Date.parse(query.from) : -Infinity;
          const toMs = query.to ? Date.parse(query.to) : Infinity;
          return [...ledger.history(accountId)]
            .reverse()
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
            .filter((tx) => {
              const at = Date.parse(tx.timestamp);
              return at >= fromMs && at < toMs;
            })
            .slice(0, limit)
            .map(toTransaction);
        }),
      createTransfer: (request, options) => call(() => createTransfer(request, options)),
      getTransferStatus: (id) => call(() => requireTransfer(id).transfer),
      listCards: () => call(() => [...cards.values()]),
      freezeCard: (id) => call(() => setCardStatus(id, 'active', 'frozen')),
      unfreezeCard: (id) => call(() => setCardStatus(id, 'frozen', 'active')),
    },
    auth: {
      async signIn(identifier, password) {
        if (latencyMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, latencyMs));
        }
        if (!identifier.trim() || !password) {
          throw new ApiError(400, 'invalid_credentials', 'Enter your username and password.');
        }
        // Demo: any credentials are accepted and the password is discarded.
        session = { customerId: 'cust-demo', displayName: 'Demo Customer' };
        return session;
      },
      async signOut() {
        session = null;
        stepUpTokens.clear();
      },
      async verifyStepUp(code) {
        if (!session) {
          throw new ApiError(401, 'unauthorized', 'Please sign in again.');
        }
        if (!/^\d{6}$/.test(code)) {
          throw new ApiError(400, 'invalid_code', 'Enter the 6-digit code.');
        }
        const token = nextId('stepup');
        stepUpTokens.set(token, now().getTime() + STEP_UP_TTL_MS);
        return token;
      },
    },
  };
}

function toMoney(value: Money): MoneyDto {
  return { amount: formatAmount(value), currency: value.currency };
}

function toTransaction(tx: LedgerTransaction): Transaction {
  return {
    id: tx.id,
    accountId: tx.accountId,
    type: tx.type,
    typeName: getTransactionType(tx.type)?.name ?? tx.type,
    amount: toMoney(tx.amount),
    status: tx.status,
    holdReason: tx.holdReason,
    timestamp: tx.timestamp,
    referenceId: tx.referenceId,
    description: tx.description,
    correctsTransactionId: tx.correctsTransactionId,
    category: tx.category,
  };
}
