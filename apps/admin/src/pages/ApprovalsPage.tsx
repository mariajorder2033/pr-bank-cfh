import { useCallback, useState } from 'react';
import { useAdmin } from '../api/AdminContext';
import { AdminError, type AdminSession, type ApprovalDecision } from '../api/types';
import { useAsync } from '../api/useAsync';
import { formatDateTime } from '../format';

/** Maker-checker approvals queue (PRD FR-77, FR-78). */
export function ApprovalsPage({ session }: { session: AdminSession }) {
  const { api } = useAdmin();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const state = useAsync(useCallback(() => api.listApprovals(filter), [api, filter]));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canDecide = session.role === 'approver' || session.role === 'super';

  async function decide(id: string, decision: ApprovalDecision) {
    setBusy(id);
    setError(null);
    try {
      await api.decideApproval(id, decision);
      state.reload();
    } catch (err) {
      setError(err instanceof AdminError ? err.message : 'Could not record the decision.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-page">
      <h1>Approvals</h1>
      {!canDecide && (
        <p className="notice">
          Your role can submit requests but not approve them. Sign in as an Approver to decide.
        </p>
      )}
      <div className="segmented">
        {(['pending', 'all'] as const).map((f) => (
          <button key={f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
            {f === 'pending' ? 'Pending' : 'All'}
          </button>
        ))}
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <ul className="approvals">
        {(state.data ?? []).map((a) => {
          const ownRequest = a.makerId === session.adminId;
          return (
            <li key={a.id} className="approval card">
              <div className="approval__head">
                <span className={`tag tag--${a.kind}`}>{a.kind}</span>
                <span className={`status status--${a.status === 'pending' ? 'on-hold' : a.status}`}>
                  {a.status}
                </span>
              </div>
              <p className="approval__summary">{a.summary}</p>
              <p className="muted approval__meta">
                Requested by {a.makerName} · {formatDateTime(a.createdAt)}
                {a.checkerName && ` · decided by ${a.checkerName}`}
              </p>
              <blockquote className="approval__note">“{a.justification}”</blockquote>
              {a.status === 'pending' && canDecide && (
                <div className="actions">
                  <button
                    className="button button--secondary button--sm"
                    disabled={busy === a.id}
                    onClick={() => decide(a.id, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    className="button button--primary button--sm"
                    disabled={busy === a.id || ownRequest}
                    title={
                      ownRequest ? 'You cannot approve your own request (four-eyes).' : undefined
                    }
                    onClick={() => decide(a.id, 'approved')}
                  >
                    {ownRequest ? 'Your request' : 'Approve'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {state.data?.length === 0 && (
          <li className="muted">No {filter === 'pending' ? 'pending ' : ''}requests.</li>
        )}
      </ul>
    </div>
  );
}
