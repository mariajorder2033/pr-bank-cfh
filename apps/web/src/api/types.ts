/**
 * Customer API types, mirroring packages/api-contracts/openapi.yaml. The contract test in
 * api/mock.test.ts validates the demo backend's responses against the spec itself.
 */

export type Currency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export interface MoneyDto {
  amount: string;
  currency: Currency;
}

export type AccountStatus = 'active' | 'pending_funding' | 'frozen' | 'closed';

export interface Account {
  id: string;
  type: 'current' | 'savings';
  name: string;
  iban: string;
  currency: Currency;
  status: AccountStatus;
  bookedBalance: MoneyDto;
  availableBalance: MoneyDto;
}

export type TransactionStatus =
  'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'on-hold';

export interface Transaction {
  id: string;
  accountId: string;
  type: string;
  typeName: string;
  amount: MoneyDto;
  status: TransactionStatus;
  holdReason: 'fraud_review' | 'sanctions_screening' | 'compliance_review' | null;
  timestamp: string;
  referenceId: string;
  description: string;
  correctsTransactionId: string | null;
  category: string | null;
}

export type TransferDestination =
  { kind: 'own_account'; accountId: string } | { kind: 'iban'; iban: string; creditorName: string };

export interface TransferRequest {
  fromAccountId: string;
  amount: MoneyDto;
  destination: TransferDestination;
  executionDate?: string;
  reference?: string;
}

export interface Transfer {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'on-hold';
  referenceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  accountId: string;
  maskedPan: string;
  brand: 'visa' | 'mastercard';
  expiry: string;
  status: 'active' | 'frozen' | 'blocked';
  virtual: boolean;
}

export interface TransactionQuery {
  from?: string;
  to?: string;
  limit?: number;
}

/** The customer API (TRD §5). */
export interface BankApi {
  listAccounts(): Promise<Account[]>;
  listTransactions(accountId: string, query?: TransactionQuery): Promise<Transaction[]>;
  createTransfer(
    request: TransferRequest,
    options: { idempotencyKey: string; stepUpToken?: string },
  ): Promise<Transfer>;
  getTransferStatus(transferId: string): Promise<Transfer>;
  listCards(): Promise<Card[]>;
  freezeCard(cardId: string): Promise<Card>;
  unfreezeCard(cardId: string): Promise<Card>;
}

export interface Session {
  customerId: string;
  displayName: string;
}

/** Sign-in and step-up MFA. Shaped after TRD §5 auth endpoints until the identity provider is chosen. */
export interface AuthApi {
  signIn(identifier: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  /** Verifies a one-time code and returns a short-lived step-up token (FR-12). */
  verifyStepUp(code: string): Promise<string>;
}

export interface Backend {
  api: BankApi;
  auth: AuthApi;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
