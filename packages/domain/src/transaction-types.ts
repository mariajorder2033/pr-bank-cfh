/**
 * Canonical transaction type list (PRD §6.12). Drives statement categorization,
 * notification templates, limit rules, and reporting.
 */

export type TransactionDirection = 'debit' | 'credit' | 'both';

export type TransactionCategory =
  | 'Transfers'
  | 'International Transfers'
  | 'Payments'
  | 'Payments (SME)'
  | 'Card'
  | 'Card / Cash'
  | 'Crypto Funding'
  | 'Savings'
  | 'Interest'
  | 'Fees'
  | 'Income'
  | 'Rewards'
  | 'Admin'
  | 'System / Admin';

export interface TransactionType<C extends string = TransactionTypeCode> {
  readonly code: C;
  readonly name: string;
  readonly direction: TransactionDirection;
  readonly category: TransactionCategory;
}

function type<const C extends string>(
  code: C,
  name: string,
  direction: TransactionDirection,
  category: TransactionCategory,
): TransactionType<C> {
  return Object.freeze({ code, name, direction, category });
}

export const TRANSACTION_TYPES = Object.freeze([
  type('TXN-01', 'Internal transfer (own accounts)', 'both', 'Transfers'),
  type('TXN-02', 'Domestic transfer — same bank', 'both', 'Transfers'),
  type('TXN-03', 'Domestic transfer — other bank (interbank)', 'both', 'Transfers'),
  type('TXN-04', 'International wire transfer (SWIFT)', 'debit', 'International Transfers'),
  type('TXN-05', 'SEPA Credit Transfer', 'debit', 'International Transfers'),
  type('TXN-06', 'SEPA Instant Transfer', 'debit', 'International Transfers'),
  type('TXN-07', 'FX conversion transfer (cross-currency)', 'both', 'International Transfers'),
  type('TXN-08', 'Remittance / cash-pickup payout', 'debit', 'International Transfers'),
  type('TXN-09', 'International bill/invoice payment', 'debit', 'International Transfers'),
  type('TXN-10', 'Domestic bill payment', 'debit', 'Payments'),
  type('TXN-11', 'Standing order / recurring payment execution', 'debit', 'Payments'),
  type('TXN-12', 'Direct debit / e-bill (LSV) collection', 'debit', 'Payments'),
  type('TXN-13', 'QR-code / P2P instant payment', 'both', 'Payments'),
  type('TXN-14', 'Split-bill / money-request settlement', 'both', 'Payments'),
  type('TXN-15', 'Batch/bulk payment', 'debit', 'Payments (SME)'),
  type('TXN-16', 'Card purchase — point of sale', 'debit', 'Card'),
  type('TXN-17', 'Card purchase — online/e-commerce', 'debit', 'Card'),
  type('TXN-18', 'ATM cash withdrawal', 'debit', 'Card'),
  type('TXN-19', 'ATM/branch cash deposit', 'credit', 'Card / Cash'),
  type('TXN-20', 'Card refund / merchant reversal', 'credit', 'Card'),
  type('TXN-21', 'Card chargeback / dispute adjustment', 'both', 'Card'),
  type('TXN-22', 'Crypto deposit — Binance conversion', 'credit', 'Crypto Funding'),
  type('TXN-23', 'Crypto deposit — direct on-chain', 'credit', 'Crypto Funding'),
  type('TXN-24', 'Savings goal contribution', 'both', 'Savings'),
  type('TXN-25', 'Round-up savings sweep', 'both', 'Savings'),
  type('TXN-26', 'Interest credit', 'credit', 'Interest'),
  type('TXN-27', 'Account/service fee debit', 'debit', 'Fees'),
  type('TXN-28', 'Foreign exchange margin/fee', 'debit', 'Fees'),
  type('TXN-29', 'Incoming salary/payroll credit', 'credit', 'Income'),
  type('TXN-30', 'General incoming credit', 'credit', 'Income'),
  type('TXN-31', 'Loyalty/rewards redemption', 'both', 'Rewards'),
  type('TXN-32', 'Admin-initiated manual adjustment', 'both', 'Admin'),
  type('TXN-33', 'Reversal', 'both', 'System / Admin'),
  type('TXN-34', 'Account closure final settlement', 'both', 'Admin'),
] as const);

export type TransactionTypeCode = (typeof TRANSACTION_TYPES)[number]['code'];

/** Standalone manual adjustment (FR-26); only created through an approved request. */
export const MANUAL_ADJUSTMENT = 'TXN-32' satisfies TransactionTypeCode;
/** Reversal entry (FR-26, FR-27a); only created by reversing another entry. */
export const REVERSAL = 'TXN-33' satisfies TransactionTypeCode;

const BY_CODE: ReadonlyMap<string, TransactionType> = new Map(
  TRANSACTION_TYPES.map((t) => [t.code, t]),
);

export function getTransactionType(code: string): TransactionType | undefined {
  return BY_CODE.get(code);
}

export function isTransactionTypeCode(code: string): code is TransactionTypeCode {
  return BY_CODE.has(code);
}
