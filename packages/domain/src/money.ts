/**
 * Money is held as an integer number of minor units (e.g. Rappen for CHF) in a bigint,
 * so arithmetic is exact. Amounts cross API boundaries as decimal strings, never floats.
 */

/**
 * ISO 4217 currencies the platform knows how to represent. Which of these a customer may
 * hold or send is configuration (PRD FR-30, FR-42), not part of the domain model.
 */
export const CURRENCIES: Readonly<Record<CurrencyCode, { readonly minorUnits: number }>> = {
  CHF: { minorUnits: 2 },
  EUR: { minorUnits: 2 },
  USD: { minorUnits: 2 },
  GBP: { minorUnits: 2 },
};

export type CurrencyCode = 'CHF' | 'EUR' | 'USD' | 'GBP';

/** CHF is the platform's base and ledger currency (PRD §5, TRD §3.3). */
export const BASE_CURRENCY: CurrencyCode = 'CHF';

export interface Money {
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
}

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(CURRENCIES, value);
}

export function money(amountMinor: bigint, currency: CurrencyCode = BASE_CURRENCY): Money {
  return Object.freeze({ amountMinor, currency });
}

const DECIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;

/** Parses a decimal string such as "1250.50" or "-3.2". Rejects excess precision. */
export function parseAmount(decimal: string, currency: CurrencyCode = BASE_CURRENCY): Money {
  const match = DECIMAL.exec(decimal);
  if (!match) {
    throw new RangeError(`Invalid amount: "${decimal}"`);
  }
  const [, sign, whole = '0', fraction = ''] = match;
  const { minorUnits } = CURRENCIES[currency];
  if (fraction.length > minorUnits) {
    throw new RangeError(
      `Amount "${decimal}" has more than ${minorUnits} decimals for ${currency}`,
    );
  }
  const minor =
    BigInt(whole) * 10n ** BigInt(minorUnits) + BigInt(fraction.padEnd(minorUnits, '0') || '0');
  return money(sign ? -minor : minor, currency);
}

/** Formats as a plain decimal string with exactly the currency's minor units, e.g. "-0.05". */
export function formatAmount(value: Money): string {
  const { minorUnits } = CURRENCIES[value.currency];
  const negative = value.amountMinor < 0n;
  const abs = negative ? -value.amountMinor : value.amountMinor;
  const scale = 10n ** BigInt(minorUnits);
  const whole = (abs / scale).toString();
  const fraction = (abs % scale).toString().padStart(minorUnits, '0');
  return `${negative ? '-' : ''}${minorUnits === 0 ? whole : `${whole}.${fraction}`}`;
}

export function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function negate(value: Money): Money {
  return money(-value.amountMinor, value.currency);
}

export function sum(values: Iterable<Money>, currency: CurrencyCode): Money {
  let total = money(0n, currency);
  for (const value of values) {
    total = add(total, value);
  }
  return total;
}
