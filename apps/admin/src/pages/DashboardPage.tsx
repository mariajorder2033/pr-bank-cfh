import { useCallback } from 'react';
import { Link } from 'react-router';
import { useAdmin } from '../api/AdminContext';
import { useAsync } from '../api/useAsync';

/** Operational overview (PRD FR-38). */
export function DashboardPage() {
  const { api } = useAdmin();
  const state = useAsync(useCallback(() => api.metrics(), [api]));
  const m = state.data;

  const tiles = [
    { label: 'Customers', value: m?.customers, to: '/customers' },
    { label: 'Accounts', value: m?.accounts, to: '/customers' },
    {
      label: 'Pending approvals',
      value: m?.pendingApprovals,
      to: '/approvals',
      highlight: (m?.pendingApprovals ?? 0) > 0,
    },
    { label: 'Transactions today', value: m?.transactionsToday, to: undefined },
  ];

  return (
    <div className="admin-page">
      <h1>Overview</h1>
      <div className="tiles">
        {tiles.map((tile) => {
          const body = (
            <>
              <span className="tile__value">{tile.value ?? '—'}</span>
              <span className="tile__label">{tile.label}</span>
            </>
          );
          return tile.to ? (
            <Link
              key={tile.label}
              to={tile.to}
              className={`tile ${tile.highlight ? 'tile--alert' : ''}`}
            >
              {body}
            </Link>
          ) : (
            <div key={tile.label} className="tile">
              {body}
            </div>
          );
        })}
      </div>
      <p className="muted">
        Corrections to posted transactions are never edits in place — they are booked as a linked
        reversal plus a replacement entry, and require a second approver (ADR 0002).
      </p>
    </div>
  );
}
