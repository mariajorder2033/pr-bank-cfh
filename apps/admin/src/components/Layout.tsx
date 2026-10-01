import { type ReactNode } from 'react';
import { NavLink } from 'react-router';
import type { AdminSession } from '../api/types';
import { RoleBadge } from './RoleBadge';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/customers', label: 'Customers' },
  { to: '/approvals', label: 'Approvals' },
  { to: '/audit', label: 'Audit log' },
];

/** Desktop-first admin shell with a fixed sidebar (ui-ux-design.md §4.8). */
export function Layout({
  session,
  onSignOut,
  children,
}: {
  session: AdminSession;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__mark">P</span>
          <span>
            Admin Portal
            <small>Back office</small>
          </span>
        </div>
        <nav aria-label="Sections">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="sidebar__link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <div>
            <strong>{session.name}</strong>
            <RoleBadge role={session.role} />
          </div>
          <button className="button button--secondary button--sm" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
