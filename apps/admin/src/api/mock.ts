/**
 * In-browser demo backend for the admin portal. It runs the real domain ledger and
 * maker-checker approvals, so a correction is enforced to go through a second approver and
 * is applied as a linked reversal + replacement (ADR 0002, FR-27a), with an immutable audit
 * entry at every step (FR-37). Replaced by the Admin Service HTTP client in production.
 */

import {
  approve,
  buildSwissIban,
  formatAmount,
  getTransactionType,
  Ledger,
  parseAmount,
  reject,
  requestApproval,
  type ApprovalRequest,
  type CorrectionPayload,
  type AdjustmentPayload,
  type Transaction as LedgerTransaction,
  type TransactionTypeCode,
} from '@pr-bank/domain';
import {
  AdminError,
  type AdjustmentInput,
  type AdminAccount,
  type AdminBackend,
  type AdminRole,
  type AdminSession,
  type AdminTransaction,
  type ApprovalDecision,
  type ApprovalKind,
  type ApprovalSummary,
  type AuditEntry,
  type CorrectionInput,
  type Customer,
  type Metrics,
  type MoneyDto,
} from './types';

const DEMO_IID = '00000';

interface PendingRequest {
  kind: ApprovalKind;
  request: ApprovalRequest<CorrectionPayload> | ApprovalRequest<AdjustmentPayload>;
  summary: string;
  makerName: string;
  checkerName: string | null;
  accountId: string;
  transactionId: string | null;
  createdAt: string;
  decidedAt: string | null;
  status: 'pending' | ApprovalDecision;
}

const ADMINS: Record<AdminRole, { id: string; name: string }> = {
  auditor: { id: 'adm-auditor', name: 'Audit Viewer' },
  ops: { id: 'adm-ops', name: 'Ops Agent' },
  approver: { id: 'adm-approver', name: 'Approver' },
  super: { id: 'adm-super', name: 'Super Admin' },
};

export function createAdminBackend({
  now = () => new Date(),
}: { now?: () => Date } = {}): AdminBackend {
  const ledger = new Ledger();
  const customers = new Map<string, Customer>();
  const accounts = new Map<string, AdminAccount & { currency: MoneyDto['currency'] }>();
  const requests = new Map<string, PendingRequest>();
  const audit: AuditEntry[] = [];
  let session: AdminSession | null = null;
  let seq = 0;
  const nextId = (p: string) => `${p}-${(++seq).toString().padStart(4, '0')}`;

  seed();

  function require(): AdminSession {
    if (!session) {
      throw new AdminError(401, 'unauthorized', 'Please sign in again.');
    }
    return session;
  }

  function requireRole(...roles: AdminRole[]): AdminSession {
    const admin = require();
    if (!roles.includes(admin.role)) {
      throw new AdminError(
        403,
        'forbidden',
        `Your role (${admin.role}) cannot perform this action.`,
      );
    }
    return admin;
  }

  function log(action: string, entity: string, detail: string): void {
    const admin = require();
    audit.unshift({
      id: nextId('aud'),
      timestamp: now().toISOString(),
      actorId: admin.adminId,
      actorName: admin.name,
      action,
      entity,
      detail,
    });
  }

  function toTxn(tx: LedgerTransaction): AdminTransaction {
    return {
      id: tx.id,
      accountId: tx.accountId,
      type: tx.type,
      typeName: getTransactionType(tx.type)?.name ?? tx.type,
      amount: { amount: formatAmount(tx.amount), currency: tx.amount.currency },
      status: tx.status,
      timestamp: tx.timestamp,
      description: tx.description,
      referenceId: tx.referenceId,
      correctsTransactionId: tx.correctsTransactionId,
      category: tx.category,
    };
  }

  function refreshBalances(accountId: string): void {
    const account = accounts.get(accountId);
    if (account) {
      account.bookedBalance = {
        amount: formatAmount(ledger.bookedBalance(accountId)),
        currency: account.currency,
      };
      account.availableBalance = {
        amount: formatAmount(ledger.availableBalance(accountId)),
        currency: account.currency,
      };
    }
  }

  function summarize(id: string, r: PendingRequest): ApprovalSummary {
    return {
      id,
      kind: r.kind,
      status: r.status,
      makerId: r.request.makerId,
      makerName: r.makerName,
      checkerId: r.request.checkerId,
      checkerName: r.checkerName,
      justification: r.request.justification,
      createdAt: r.createdAt,
      decidedAt: r.decidedAt,
      summary: r.summary,
      accountId: r.accountId,
      transactionId: r.transactionId,
    };
  }

  function createCorrection(input: CorrectionInput): ApprovalSummary {
    const admin = requireRole('ops', 'super');
    const original = ledger.get(input.transactionId);
    if (!original) {
      throw new AdminError(404, 'not_found', 'Transaction not found.');
    }
    if (original.status !== 'completed') {
      throw new AdminError(
        409,
        'not_correctable',
        'Only a completed transaction can be corrected.',
      );
    }
    if (!input.justification.trim()) {
      throw new AdminError(400, 'bad_request', 'A justification note is required.');
    }
    let replacement: CorrectionPayload['replacement'];
    let summary = `Reverse ${original.type} ${formatAmount(original.amount)} ${original.amount.currency} — "${original.description}"`;
    if (input.newAmount !== undefined) {
      let amount;
      try {
        amount = parseAmount(input.newAmount, original.amount.currency);
      } catch {
        throw new AdminError(400, 'invalid_amount', 'Enter an amount with at most two decimals.');
      }
      if (
        amount.amountMinor === 0n ||
        amount.amountMinor > 0n !== original.amount.amountMinor > 0n
      ) {
        throw new AdminError(
          400,
          'invalid_amount',
          'The corrected amount must have the same debit/credit sign.',
        );
      }
      replacement = { id: nextId('txn'), amount };
      summary = `Correct ${original.type} amount ${formatAmount(original.amount)} → ${formatAmount(amount)} ${amount.currency}`;
    }
    const request = requestApproval<CorrectionPayload>({
      id: nextId('corr'),
      makerId: admin.adminId,
      justification: input.justification,
      payload: {
        transactionId: original.id,
        reversalId: nextId('txn'),
        timestamp: now().toISOString(),
        replacement,
      },
    });
    const record: PendingRequest = {
      kind: 'correction',
      request,
      summary,
      makerName: admin.name,
      checkerName: null,
      accountId: original.accountId,
      transactionId: original.id,
      createdAt: now().toISOString(),
      decidedAt: null,
      status: 'pending',
    };
    requests.set(request.id, record);
    log(
      'correction_requested',
      `transaction:${original.id}`,
      `${summary} — "${input.justification}"`,
    );
    return summarize(request.id, record);
  }

  function createAdjustment(input: AdjustmentInput): ApprovalSummary {
    const admin = requireRole('ops', 'super');
    const account = accounts.get(input.accountId);
    if (!account) {
      throw new AdminError(404, 'not_found', 'Account not found.');
    }
    if (!input.justification.trim() || !input.description.trim()) {
      throw new AdminError(400, 'bad_request', 'A description and justification are required.');
    }
    let amount;
    try {
      amount = parseAmount(input.amount, account.currency);
    } catch {
      throw new AdminError(400, 'invalid_amount', 'Enter an amount with at most two decimals.');
    }
    if (amount.amountMinor === 0n) {
      throw new AdminError(400, 'invalid_amount', 'Enter a non-zero amount.');
    }
    const request = requestApproval<AdjustmentPayload>({
      id: nextId('adj'),
      makerId: admin.adminId,
      justification: input.justification,
      payload: {
        id: nextId('txn'),
        accountId: account.id,
        amount,
        timestamp: now().toISOString(),
        description: input.description,
      },
    });
    const summary = `Manual adjustment ${formatAmount(amount)} ${amount.currency} — "${input.description}"`;
    const record: PendingRequest = {
      kind: 'adjustment',
      request,
      summary,
      makerName: admin.name,
      checkerName: null,
      accountId: account.id,
      transactionId: null,
      createdAt: now().toISOString(),
      decidedAt: null,
      status: 'pending',
    };
    requests.set(request.id, record);
    log('adjustment_requested', `account:${account.id}`, `${summary} — "${input.justification}"`);
    return summarize(request.id, record);
  }

  function decide(
    id: string,
    decision: ApprovalDecision,
    note: string | undefined,
  ): ApprovalSummary {
    const admin = requireRole('approver', 'super');
    const record = requests.get(id);
    if (!record) {
      throw new AdminError(404, 'not_found', 'Approval request not found.');
    }
    if (record.status !== 'pending') {
      throw new AdminError(409, 'already_decided', `This request is already ${record.status}.`);
    }
    if (record.request.makerId === admin.adminId) {
      throw new AdminError(403, 'four_eyes', 'The maker and checker must be different people.');
    }
    const at = now().toISOString();
    if (decision === 'rejected') {
      // reject() only touches status/checker fields, so the payload type is irrelevant here.
      record.request = reject(
        record.request as ApprovalRequest<CorrectionPayload>,
        admin.adminId,
        at,
      );
      record.status = 'rejected';
      record.checkerName = admin.name;
      record.decidedAt = at;
      log('approval_rejected', `request:${id}`, `${record.summary}${note ? ` — "${note}"` : ''}`);
      return summarize(id, record);
    }
    // Apply the change on approval. Narrow by kind so the payload type is concrete.
    if (record.kind === 'correction') {
      const approved = approve(
        record.request as ApprovalRequest<CorrectionPayload>,
        admin.adminId,
        at,
      );
      ledger.correct(approved);
      record.request = approved;
    } else {
      const approved = approve(
        record.request as ApprovalRequest<AdjustmentPayload>,
        admin.adminId,
        at,
      );
      ledger.adjust(approved);
      record.request = approved;
    }
    record.status = 'approved';
    record.checkerName = admin.name;
    record.decidedAt = at;
    refreshBalances(record.accountId);
    log('approval_approved', `request:${id}`, `Applied: ${record.summary}`);
    return summarize(id, record);
  }

  function seed(): void {
    const iso = (daysAgo: number) => {
      const d = new Date(now());
      d.setUTCDate(d.getUTCDate() - daysAgo);
      d.setUTCHours(9, 0, 0, 0);
      return d.toISOString();
    };
    const addCustomer = (
      id: string,
      legalName: string,
      email: string,
      kyc: Customer['kycStatus'],
    ) => customers.set(id, { id, legalName, email, kycStatus: kyc });
    const addAccount = (id: string, customerId: string, name: string, bban: string) => {
      ledger.openAccount({ id, currency: 'CHF' });
      accounts.set(id, {
        id,
        customerId,
        name,
        iban: buildSwissIban(DEMO_IID, bban),
        currency: 'CHF',
        bookedBalance: { amount: '0.00', currency: 'CHF' },
        availableBalance: { amount: '0.00', currency: 'CHF' },
      });
    };
    const book = (
      accountId: string,
      type: TransactionTypeCode,
      amount: string,
      daysAgo: number,
      description: string,
    ) =>
      ledger.record({
        id: nextId('txn'),
        accountId,
        type,
        amount: parseAmount(amount, 'CHF'),
        status: 'completed',
        timestamp: iso(daysAgo),
        referenceId: `REF${seq}`,
        description,
      });

    addCustomer('cust-001', 'Anna Müller', 'anna.mueller@example.ch', 'verified');
    addCustomer('cust-002', 'Beat Schmid', 'beat.schmid@example.ch', 'verified');
    addCustomer('cust-003', 'Carla Rossi', 'carla.rossi@example.ch', 'review');

    addAccount('acc-001', 'cust-001', 'Private account', '100100100');
    addAccount('acc-002', 'cust-001', 'Savings account', '100100101');
    addAccount('acc-003', 'cust-002', 'Private account', '100200200');
    addAccount('acc-004', 'cust-003', 'Private account', '100300300');

    book('acc-001', 'TXN-29', '7200.00', 20, 'Salary — Example Employer AG');
    book('acc-001', 'TXN-16', '-220.45', 12, 'Electronics retailer');
    const bill = book('acc-001', 'TXN-10', '-540.00', 8, 'City Utilities — electricity');
    book('acc-002', 'TXN-30', '20000.00', 30, 'Incoming transfer');
    book('acc-003', 'TXN-29', '5400.00', 18, 'Salary');
    book('acc-003', 'TXN-16', '-89.90', 5, 'Grocery store');
    book('acc-004', 'TXN-30', '1200.00', 15, 'Incoming transfer');
    for (const id of accounts.keys()) {
      refreshBalances(id);
    }

    // Pre-seed one pending correction so the approvals queue is populated for a checker.
    session = { adminId: ADMINS.ops.id, name: ADMINS.ops.name, role: 'ops' };
    createCorrection({
      transactionId: bill.id,
      justification: 'Biller confirmed the invoice was CHF 410.00, not 540.00',
      newAmount: '-410.00',
    });
    session = null;
  }

  return {
    current: () => session,
    auth: {
      async signIn(_adminId, role) {
        const admin = ADMINS[role];
        session = { adminId: admin.id, name: admin.name, role };
        return session;
      },
      async signOut() {
        session = null;
      },
    },
    api: {
      async metrics(): Promise<Metrics> {
        require();
        const today = now().toISOString().slice(0, 10);
        let txnsToday = 0;
        for (const id of accounts.keys()) {
          txnsToday += ledger.history(id).filter((t) => t.timestamp.startsWith(today)).length;
        }
        return {
          customers: customers.size,
          accounts: accounts.size,
          pendingApprovals: [...requests.values()].filter((r) => r.status === 'pending').length,
          transactionsToday: txnsToday,
        };
      },
      async listCustomers(query = '') {
        require();
        const q = query.trim().toLowerCase();
        return [...customers.values()].filter(
          (c) =>
            !q ||
            c.legalName.toLowerCase().includes(q) ||
            c.id.includes(q) ||
            c.email.toLowerCase().includes(q),
        );
      },
      async getCustomer(id) {
        require();
        const customer = customers.get(id);
        if (!customer) {
          throw new AdminError(404, 'not_found', 'Customer not found.');
        }
        return {
          customer,
          accounts: [...accounts.values()].filter((a) => a.customerId === id).map(stripCurrency),
        };
      },
      async listTransactions(accountId) {
        require();
        if (!accounts.has(accountId)) {
          throw new AdminError(404, 'not_found', 'Account not found.');
        }
        return [...ledger.history(accountId)]
          .reverse()
          .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
          .map(toTxn);
      },
      async requestCorrection(input) {
        return createCorrection(input);
      },
      async requestAdjustment(input) {
        return createAdjustment(input);
      },
      async listApprovals(filter = 'pending') {
        require();
        return [...requests.entries()]
          .filter(([, r]) => filter === 'all' || r.status === 'pending')
          .sort((a, b) => Date.parse(b[1].createdAt) - Date.parse(a[1].createdAt))
          .map(([id, r]) => summarize(id, r));
      },
      async decideApproval(id, decision, note) {
        return decide(id, decision, note);
      },
      async listAuditLog() {
        require();
        return [...audit];
      },
    },
  };
}

function stripCurrency(account: AdminAccount & { currency: MoneyDto['currency'] }): AdminAccount {
  const { currency: _currency, ...rest } = account;
  void _currency;
  return rest;
}
