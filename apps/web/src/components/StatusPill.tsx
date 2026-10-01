const STYLES: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  pending: { label: 'Pending', tone: 'warning' },
  processing: { label: 'Processing', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  reversed: { label: 'Reversed', tone: 'neutral' },
  'on-hold': { label: 'On hold', tone: 'neutral' },
  active: { label: 'Active', tone: 'success' },
  frozen: { label: 'Frozen', tone: 'danger' },
  blocked: { label: 'Blocked', tone: 'danger' },
};

/** Status pill per ui-ux-design.md §2.4: pending amber, completed green, failed red, on-hold gray. */
export function StatusPill({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, tone: 'neutral' as const };
  return <span className={`pill pill--${style.tone}`}>{style.label}</span>;
}
