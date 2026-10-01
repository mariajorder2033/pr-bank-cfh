/** Admin/back-office API types (PRD §6.10). Mirrors the admin endpoints in TRD §5. */

export type AdminRole = 'auditor' | 'ops' | 'approver' | 'super';

export interface AdminSession {
  adminId: string;
  name: string;
  role: AdminRole;
}

export interface MoneyDto {
  amount: string;
  currency: 'CHF' | 'EUR' | 'USD' | 'GBP';
}

export interface Customer {
  id: string;
  legalName: string;
  kycStatus: 'verified' | 'pending' | 'review';
  email: string;
}

export interface AdminAccount {
  id: string;
  customerId: string;
  name: string;
  iban: string;
  bookedBalance: MoneyDto;
  availableBalance: MoneyDto;
}

export interface AdminTransaction {
  id: string;
  accountId: string;
  type: string;
  typeName: string;
  amount: MoneyDto;
  status: string;
  timestamp: string;
  description: string;
  referenceId: string;
  correctsTransactionId: string | null;
  category: string | null;
}

export type ApprovalKind = 'correction' | 'adjustment';
export type ApprovalDecision = 'approved' | 'rejected';

/** A maker-checker request (FR-77, FR-78). The payload is kept opaque to the UI. */
export interface ApprovalSummary {
  id: string;
  kind: ApprovalKind;
  status: 'pending' | ApprovalDecision;
  makerId: string;
  makerName: string;
  checkerId: string | null;
  checkerName: string | null;
  justification: string;
  createdAt: string;
  decidedAt: string | null;
  /** Human-readable description of the change, e.g. "Correct TXN amount 120.00 → 94.35". */
  summary: string;
  accountId: string;
  transactionId: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  detail: string;
}

export interface CorrectionInput {
  transactionId: string;
  justification: string;
  /** New amount as a positive/negative decimal string; omit to reverse only. */
  newAmount?: string;
}

export interface AdjustmentInput {
  accountId: string;
  /** Signed decimal string; negative debits, positive credits. */
  amount: string;
  description: string;
  justification: string;
}

export interface Metrics {
  customers: number;
  accounts: number;
  pendingApprovals: number;
  transactionsToday: number;
}

export class AdminError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export interface AdminApi {
  metrics(): Promise<Metrics>;
  listCustomers(query?: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<{ customer: Customer; accounts: AdminAccount[] }>;
  listTransactions(accountId: string): Promise<AdminTransaction[]>;
  requestCorrection(input: CorrectionInput): Promise<ApprovalSummary>;
  requestAdjustment(input: AdjustmentInput): Promise<ApprovalSummary>;
  listApprovals(filter?: 'pending' | 'all'): Promise<ApprovalSummary[]>;
  decideApproval(id: string, decision: ApprovalDecision, note?: string): Promise<ApprovalSummary>;
  listAuditLog(): Promise<AuditEntry[]>;
}

export interface AdminAuth {
  signIn(adminId: string, role: AdminRole): Promise<AdminSession>;
  signOut(): Promise<void>;
}

export interface AdminBackend {
  api: AdminApi;
  auth: AdminAuth;
  /** The signed-in admin, for RBAC decisions in the UI. */
  current(): AdminSession | null;
}
