import type { AdminRole } from '../api/types';

const LABELS: Record<AdminRole, string> = {
  auditor: 'Auditor (read-only)',
  ops: 'Ops (maker)',
  approver: 'Approver (checker)',
  super: 'Super admin',
};

export function RoleBadge({ role }: { role: AdminRole }) {
  return <span className="role">{LABELS[role]}</span>;
}
