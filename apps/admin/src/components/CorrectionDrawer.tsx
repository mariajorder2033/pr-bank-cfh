import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAdmin } from '../api/AdminContext';
import { AdminError, type AdminTransaction } from '../api/types';
import { formatMoney } from '../format';

/**
 * Side drawer to request a transaction correction (ui-ux-design.md §4.8, FR-27a).
 * It never edits the posted entry: it submits a maker-checker request that, once a second
 * admin approves, books a reversal plus an optional replacement.
 */
export function CorrectionDrawer({
  transaction,
  onClose,
  onSubmitted,
}: {
  transaction: AdminTransaction;
  onClose: () => void;
  onSubmitted: (summary: string) => void;
}) {
  const { api } = useAdmin();
  const [mode, setMode] = useState<'replace' | 'reverse'>('replace');
  const [newAmount, setNewAmount] = useState(transaction.amount.amount);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    drawer.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!justification.trim()) {
      setError('A justification note is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const summary = await api.requestCorrection({
        transactionId: transaction.id,
        justification,
        newAmount: mode === 'replace' ? newAmount : undefined,
      });
      onSubmitted(summary.summary);
    } catch (err) {
      setError(err instanceof AdminError ? err.message : 'Could not submit the correction.');
      setBusy(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        ref={drawer}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Request correction"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="h2">Request correction</h2>
        <dl className="kv">
          <div>
            <dt>Transaction</dt>
            <dd className="mono">{transaction.id}</dd>
          </div>
          <div>
            <dt>Current</dt>
            <dd>
              {transaction.description} · {formatMoney(transaction.amount)}
            </dd>
          </div>
        </dl>

        <form onSubmit={submit}>
          <fieldset className="radio-group">
            <legend>How should this be corrected?</legend>
            <label className="radio">
              <input
                type="radio"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              Reverse and re-book with a new amount
            </label>
            <label className="radio">
              <input
                type="radio"
                checked={mode === 'reverse'}
                onChange={() => setMode('reverse')}
              />
              Reverse only (no replacement)
            </label>
          </fieldset>

          {mode === 'replace' && (
            <div className="field">
              <label htmlFor="newAmount">Corrected amount ({transaction.amount.currency})</label>
              <input
                id="newAmount"
                className="money"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                inputMode="decimal"
              />
              <p className="field__hint">
                Same debit/credit sign as the original (negative for a debit).
              </p>
            </div>
          )}

          <div className="field">
            <label htmlFor="justification">Justification note (required)</label>
            <textarea
              id="justification"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              aria-invalid={error !== null && !justification.trim()}
            />
          </div>

          <p className="notice">
            This does not change the posted entry. On a second admin’s approval it books a reversal
            {mode === 'replace' ? ' and a replacement entry' : ''}, logged to the audit trail.
          </p>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="actions">
            <button type="button" className="button button--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button--primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit for approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
