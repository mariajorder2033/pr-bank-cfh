import type { Transaction } from '../api/types';
import { formatDate } from '../format';
import { Money } from './Money';
import { StatusPill } from './StatusPill';

/** Transaction rows (ui-ux-design.md §2.4): name, category, date, status and amount. */
export function TransactionList({
  transactions,
  empty,
  hideAmounts = false,
}: {
  transactions: Transaction[];
  empty: string;
  hideAmounts?: boolean;
}) {
  if (transactions.length === 0) {
    return <p className="empty">{empty}</p>;
  }
  return (
    <ul className="txn-list">
      {transactions.map((tx) => (
        <li key={tx.id} className={`txn ${tx.status === 'reversed' ? 'txn--reversed' : ''}`}>
          <span className="txn__avatar" aria-hidden="true">
            {tx.description
              .replace(/^Reversal: /, '')
              .charAt(0)
              .toUpperCase()}
          </span>
          <span className="txn__main">
            <span className="txn__name">{tx.description}</span>
            <span className="txn__meta">
              {formatDate(tx.timestamp)} · {tx.category ?? tx.typeName}
              {tx.correctsTransactionId && tx.type !== 'TXN-33' ? ' · Corrected entry' : ''}
            </span>
          </span>
          <span className="txn__end">
            {hideAmounts ? (
              <span className="money" aria-label="Hidden">
                ••••
              </span>
            ) : (
              <Money value={tx.amount} signed />
            )}
            {tx.status !== 'completed' && <StatusPill status={tx.status} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
