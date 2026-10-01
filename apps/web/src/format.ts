import { formatAmount, parseAmount, sum } from '@pr-bank/domain';
import type { MoneyDto } from './api/types';

// Swiss number formatting (1’234.50), formatting the decimal string exactly with no float rounding.
const number = new Intl.NumberFormat('de-CH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "CHF 1’234.50", or "−CHF 42.50" / "+CHF 6’500.00" with `signed`. */
export function formatMoney({ amount, currency }: MoneyDto, { signed = false } = {}): string {
  const negative = amount.startsWith('-');
  const digits = number.format((negative ? amount.slice(1) : amount) as `${number}`);
  const sign = negative ? '−' : signed && !/^0(\.0+)?$/.test(amount) ? '+' : '';
  return `${sign}${currency} ${digits}`;
}

export function isCredit({ amount }: MoneyDto): boolean {
  return !amount.startsWith('-') && !/^0(\.0+)?$/.test(amount);
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${dateFormat.format(date)}, ${timeFormat.format(date)}`;
}

/** Adds up decimal-string amounts exactly, using the domain's integer minor units. */
export function sumMoney(values: MoneyDto[], currency: MoneyDto['currency']): MoneyDto {
  const total = sum(
    values
      .filter((value) => value.currency === currency)
      .map((value) => parseAmount(value.amount, currency)),
    currency,
  );
  return { amount: formatAmount(total), currency };
}
