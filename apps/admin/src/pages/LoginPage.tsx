import { useState } from 'react';
import { useAdmin } from '../api/AdminContext';
import type { AdminRole, AdminSession } from '../api/types';

const ROLES: { role: AdminRole; label: string; detail: string }[] = [
  { role: 'ops', label: 'Ops Agent', detail: 'Maker: can request corrections and adjustments' },
  {
    role: 'approver',
    label: 'Approver',
    detail: 'Checker: can approve or reject others’ requests',
  },
  { role: 'auditor', label: 'Auditor', detail: 'Read-only access to records and the audit log' },
  { role: 'super', label: 'Super Admin', detail: 'Maker and checker (never on the same request)' },
];

/** Demo sign-in: pick a role to see how RBAC and maker-checker gate actions. */
export function LoginPage({ onSignedIn }: { onSignedIn: (session: AdminSession) => void }) {
  const { auth } = useAdmin();
  const [busy, setBusy] = useState<AdminRole | null>(null);

  async function signIn(role: AdminRole) {
    setBusy(role);
    onSignedIn(await auth.signIn(role, role));
  }

  return (
    <div className="admin-login">
      <div className="admin-login__panel">
        <div className="sidebar__brand sidebar__brand--lg">
          <span className="sidebar__mark">P</span>
          <span>Admin Portal</span>
        </div>
        <h1>Sign in</h1>
        <p className="muted">
          Demo: every admin action is RBAC-gated, needs a justification note, and regulated changes
          need a second approver (PRD §6.10). Choose a role to explore.
        </p>
        <ul className="role-picker">
          {ROLES.map((option) => (
            <li key={option.role}>
              <button
                className="role-picker__btn"
                onClick={() => signIn(option.role)}
                disabled={busy !== null}
              >
                <strong>{option.label}</strong>
                <span className="muted">{option.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
