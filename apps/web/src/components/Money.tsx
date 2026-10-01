import type { MoneyDto } from '../api/types';
import { formatMoney, isCredit } from '../format';

/** An amount in tabular figures; credits are green and signed when `signed` is set. */
export function Money({
  value,
  signed = false,
  className = '',
}: {
  value: MoneyDto;
  signed?: boolean;
  className?: string;
}) {
  const tone = signed && isCredit(value) ? 'money--credit' : '';
  return (
    <span className={`money ${tone} ${className}`.trim()}>{formatMoney(value, { signed })}</span>
  );
}
