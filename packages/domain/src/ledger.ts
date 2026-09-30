/**
 * Append-only transaction ledger (PRD FR-27a, TRD §4, ADR 0002).
 *
 * Posted entries are never edited or deleted. A mistake is corrected by a linked reversal
 * (TXN-33) and, where needed, a linked replacement entry, both behind maker-checker approval.
 * Status is lifecycle state and moves only along TRANSITIONS; the budgeting category is the
 * only other field that can change after an entry is recorded.
 *
 * This is the in-memory reference implementation of the rules; a persistent implementation
 * must enforce the same invariants at the storage layer.
 */

import { assertApproved, type ApprovalRequest } from './maker-checker.js';
import { money, negate, sum, type CurrencyCode, type Money } from './money.js';
import {
  getTransactionType,
  MANUAL_ADJUSTMENT,
  REVERSAL,
  type TransactionTypeCode,
} from './transaction-types.js';

export const TRANSACTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'reversed',
  'on-hold',
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const HOLD_REASONS = ['fraud_review', 'sanctions_screening', 'compliance_review'] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

export interface LedgerAccount {
  readonly id: string;
  readonly currency: CurrencyCode;
}

export interface Transaction {
  readonly id: string;
  readonly accountId: string;
  readonly type: TransactionTypeCode;
  /** Signed: credits are positive, debits negative. */
  readonly amount: Money;
  readonly status: TransactionStatus;
  readonly holdReason: HoldReason | null;
  /** Value date/time, ISO-8601. */
  readonly timestamp: string;
  readonly referenceId: string;
  /** Set on reversal and replacement entries: the transaction they reverse or correct. */
  readonly correctsTransactionId: string | null;
  /** Budgeting category tag: non-financial metadata, editable after posting. */
  readonly category: string | null;
}

export interface NewTransaction {
  readonly id: string;
  readonly accountId: string;
  readonly type: TransactionTypeCode;
  readonly amount: Money;
  readonly timestamp: string;
  readonly referenceId: string;
  readonly status?: 'pending' | 'processing' | 'completed';
  readonly category?: string | null;
}

/** Payload of an admin correction request (FR-27a). */
export interface CorrectionPayload {
  /** The posted transaction being corrected. */
  readonly transactionId: string;
  readonly reversalId: string;
  /** Booking time of the reversal. */
  readonly timestamp: string;
  /** The corrected posting. Omit to reverse without replacement. */
  readonly replacement?: {
    readonly id: string;
    readonly amount: Money;
    /** Defaults to the original's type. */
    readonly type?: TransactionTypeCode;
    /** Defaults to the original's account. */
    readonly accountId?: string;
    /** Defaults to the original's value date. */
    readonly timestamp?: string;
  };
}

/** Payload of a standalone manual adjustment request (TXN-32). */
export interface AdjustmentPayload {
  readonly id: string;
  readonly accountId: string;
  readonly amount: Money;
  readonly timestamp: string;
}

export type LedgerErrorCode =
  | 'unknown_account'
  | 'unknown_transaction'
  | 'duplicate'
  | 'invalid_type'
  | 'invalid_amount'
  | 'invalid_transition'
  | 'not_reversible';

export class LedgerError extends Error {
  constructor(
    readonly code: LedgerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LedgerError';
  }
}

const POSTED: ReadonlySet<TransactionStatus> = new Set(['completed', 'reversed']);
const IN_FLIGHT: ReadonlySet<TransactionStatus> = new Set(['pending', 'processing', 'on-hold']);

/** Allowed status changes. `completed → reversed` happens only through reverse() or correct(). */
const TRANSITIONS: Readonly<Record<TransactionStatus, readonly TransactionStatus[]>> = {
  pending: ['processing', 'on-hold', 'failed'],
  processing: ['completed', 'on-hold', 'failed'],
  'on-hold': ['processing', 'failed'],
  completed: [],
  failed: [],
  reversed: [],
};

export class Ledger {
  readonly #accounts = new Map<string, LedgerAccount>();
  readonly #transactions = new Map<string, Transaction>();
  readonly #history = new Map<string, string[]>();

  openAccount(account: LedgerAccount): void {
    if (this.#accounts.has(account.id)) {
      throw new LedgerError('duplicate', `Account ${account.id} already exists`);
    }
    this.#accounts.set(account.id, Object.freeze({ ...account }));
    this.#history.set(account.id, []);
  }

  get(id: string): Transaction | undefined {
    return this.#transactions.get(id);
  }

  /** All entries for an account, oldest first. */
  history(accountId: string): readonly Transaction[] {
    const ids = this.#history.get(accountId);
    if (!ids) {
      throw new LedgerError('unknown_account', `Unknown account ${accountId}`);
    }
    return ids.map((id) => this.#require(id));
  }

  /** Records a customer or system transaction. Reversals and adjustments have their own methods. */
  record(input: NewTransaction): Transaction {
    if (input.type === REVERSAL || input.type === MANUAL_ADJUSTMENT) {
      throw new LedgerError(
        'invalid_type',
        `${input.type} entries are created only through reverse(), correct() or adjust()`,
      );
    }
    return this.#insert(
      this.#validate({
        ...input,
        status: input.status ?? 'pending',
        holdReason: null,
        correctsTransactionId: null,
        category: input.category ?? null,
      }),
    );
  }

  transition(id: string, next: TransactionStatus, holdReason?: HoldReason): Transaction {
    const tx = this.#require(id);
    if (!TRANSITIONS[tx.status].includes(next)) {
      throw new LedgerError('invalid_transition', `Cannot move ${id} from ${tx.status} to ${next}`);
    }
    if (next === 'on-hold' && !holdReason) {
      throw new LedgerError('invalid_transition', 'Putting a transaction on hold needs a reason');
    }
    return this.#update({
      ...tx,
      status: next,
      holdReason: next === 'on-hold' ? (holdReason ?? null) : null,
    });
  }

  /**
   * Books a reversal that exactly offsets a completed entry, e.g. a returned interbank payment.
   * This is the system path; admin-initiated reversals go through correct() for approval.
   */
  reverse(
    originalId: string,
    entry: { id: string; timestamp: string; referenceId: string },
  ): Transaction {
    const original = this.#require(originalId);
    if (original.status !== 'completed' || original.type === REVERSAL) {
      throw new LedgerError('not_reversible', `Transaction ${originalId} cannot be reversed`);
    }
    const reversal = this.#insert(
      this.#validate({
        id: entry.id,
        accountId: original.accountId,
        type: REVERSAL,
        amount: negate(original.amount),
        status: 'completed',
        holdReason: null,
        timestamp: entry.timestamp,
        referenceId: entry.referenceId,
        correctsTransactionId: original.id,
        category: original.category,
      }),
    );
    this.#update({ ...original, status: 'reversed' });
    return reversal;
  }

  /** Admin correction (FR-27a): reverses the original and optionally posts a linked replacement. */
  correct(request: ApprovalRequest<CorrectionPayload>): {
    reversal: Transaction;
    replacement: Transaction | null;
  } {
    assertApproved(request);
    const { transactionId, reversalId, timestamp, replacement } = request.payload;
    const original = this.#require(transactionId);

    // Validate the replacement before anything is booked, so a correction applies fully or not at all.
    let next: Transaction | null = null;
    if (replacement) {
      if (replacement.id === reversalId) {
        throw new LedgerError('duplicate', 'Reversal and replacement need distinct IDs');
      }
      if (replacement.type === REVERSAL) {
        throw new LedgerError('invalid_type', 'A replacement cannot be a reversal');
      }
      next = this.#validate({
        id: replacement.id,
        accountId: replacement.accountId ?? original.accountId,
        type: replacement.type ?? original.type,
        amount: replacement.amount,
        status: 'completed',
        holdReason: null,
        timestamp: replacement.timestamp ?? original.timestamp,
        referenceId: request.id,
        correctsTransactionId: original.id,
        category: original.category,
      });
    }

    const reversal = this.reverse(original.id, {
      id: reversalId,
      timestamp,
      referenceId: request.id,
    });
    return { reversal, replacement: next ? this.#insert(next) : null };
  }

  /** Standalone manual adjustment (TXN-32) with no underlying transaction, e.g. a goodwill credit. */
  adjust(request: ApprovalRequest<AdjustmentPayload>): Transaction {
    assertApproved(request);
    const { id, accountId, amount, timestamp } = request.payload;
    return this.#insert(
      this.#validate({
        id,
        accountId,
        type: MANUAL_ADJUSTMENT,
        amount,
        status: 'completed',
        holdReason: null,
        timestamp,
        referenceId: request.id,
        correctsTransactionId: null,
        category: null,
      }),
    );
  }

  /** Sets the budgeting category tag, the one field that is not part of the financial record. */
  setCategory(id: string, category: string | null): Transaction {
    return this.#update({ ...this.#require(id), category });
  }

  /** Sum of posted entries. */
  bookedBalance(accountId: string): Money {
    return sum(
      this.history(accountId)
        .filter((tx) => POSTED.has(tx.status))
        .map((tx) => tx.amount),
      this.#requireAccount(accountId).currency,
    );
  }

  /** Booked balance less debits that are still in flight. */
  availableBalance(accountId: string): Money {
    const pendingDebits = sum(
      this.history(accountId)
        .filter((tx) => IN_FLIGHT.has(tx.status) && tx.amount.amountMinor < 0n)
        .map((tx) => tx.amount),
      this.#requireAccount(accountId).currency,
    );
    return money(
      this.bookedBalance(accountId).amountMinor + pendingDebits.amountMinor,
      pendingDebits.currency,
    );
  }

  #validate(tx: Transaction): Transaction {
    const account = this.#requireAccount(tx.accountId);
    if (this.#transactions.has(tx.id)) {
      throw new LedgerError('duplicate', `Transaction ${tx.id} already exists`);
    }
    const type = getTransactionType(tx.type);
    if (!type) {
      throw new LedgerError('invalid_type', `Unknown transaction type ${tx.type}`);
    }
    if (tx.amount.currency !== account.currency) {
      throw new LedgerError(
        'invalid_amount',
        `Account ${account.id} is in ${account.currency}, not ${tx.amount.currency}`,
      );
    }
    const minor = tx.amount.amountMinor;
    if (minor === 0n) {
      throw new LedgerError('invalid_amount', 'Amount must be non-zero');
    }
    if ((type.direction === 'debit' && minor > 0n) || (type.direction === 'credit' && minor < 0n)) {
      throw new LedgerError(
        'invalid_amount',
        `${tx.type} is ${type.direction}-only; debits are negative, credits positive`,
      );
    }
    return Object.freeze({ ...tx });
  }

  #insert(tx: Transaction): Transaction {
    this.#transactions.set(tx.id, tx);
    this.#history.get(tx.accountId)?.push(tx.id);
    return tx;
  }

  /** Replaces lifecycle or metadata fields. Callers spread the stored entry, so financial fields carry over. */
  #update(tx: Transaction): Transaction {
    const frozen = Object.freeze({ ...tx });
    this.#transactions.set(tx.id, frozen);
    return frozen;
  }

  #require(id: string): Transaction {
    const tx = this.#transactions.get(id);
    if (!tx) {
      throw new LedgerError('unknown_transaction', `Unknown transaction ${id}`);
    }
    return tx;
  }

  #requireAccount(id: string): LedgerAccount {
    const account = this.#accounts.get(id);
    if (!account) {
      throw new LedgerError('unknown_account', `Unknown account ${id}`);
    }
    return account;
  }
}
