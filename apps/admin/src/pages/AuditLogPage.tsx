import { useCallback } from 'react';
import { useAdmin } from '../api/AdminContext';
import { useAsync } from '../api/useAsync';
import { formatDateTime } from '../format';

/** Immutable audit trail viewer (PRD FR-37). Read-only by design. */
export function AuditLogPage() {
  const { api } = useAdmin();
  const state = useAsync(useCallback(() => api.listAuditLog(), [api]));

  return (
    <div className="admin-page">
      <h1>Audit log</h1>
      <p className="muted">
        Append-only record of admin actions. Never editable, even by a super admin.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {(state.data ?? []).map((e) => (
            <tr key={e.id}>
              <td>{formatDateTime(e.timestamp)}</td>
              <td>{e.actorName}</td>
              <td className="mono">{e.action}</td>
              <td className="mono">{e.entity}</td>
              <td>{e.detail}</td>
            </tr>
          ))}
          {state.data?.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No admin actions recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
