import type { MoneyDto } from './api/types';

const number = new Intl.NumberFormat('de-CH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney({ amount, currency }: MoneyDto): string {
  const negative = amount.startsWith('-');
  return `${negative ? '−' : ''}${currency} ${number.format((negative ? amount.slice(1) : amount) as `${number}`)}`;
}

const dt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(iso: string): string {
  return dt.format(new Date(iso));
}
