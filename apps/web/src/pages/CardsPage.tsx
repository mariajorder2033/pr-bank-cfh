import { useCallback, useState } from 'react';
import { useBackend } from '../api/BackendContext';
import type { Card } from '../api/types';
import { useAsync } from '../api/useAsync';
import { StatusPill } from '../components/StatusPill';
import { usePageTitle } from '../usePageTitle';

/** Cards (ui-ux-design.md §4.5, PRD FR-14, FR-15, FR-50). */
export function CardsPage() {
  usePageTitle('Cards');
  const { api } = useBackend();
  const load = useCallback(() => api.listCards(), [api]);
  const state = useAsync(load);
  const [updates, setUpdates] = useState<Record<string, Card>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleFreeze(card: Card) {
    setPending(card.id);
    setError(null);
    try {
      const next =
        card.status === 'frozen' ? await api.unfreezeCard(card.id) : await api.freezeCard(card.id);
      setUpdates((u) => ({ ...u, [card.id]: next }));
    } catch {
      setError('The card could not be updated. Try again.');
    } finally {
      setPending(null);
    }
  }

  const cards = (state.data ?? []).map((card) => updates[card.id] ?? card);

  return (
    <div className="page" aria-busy={state.status === 'loading'}>
      <h1 className="page__title">Cards</h1>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {state.status === 'error' && !state.data && (
        <p className="alert" role="alert">
          Your cards could not be loaded.{' '}
          <button className="link" onClick={state.reload}>
            Try again
          </button>
        </p>
      )}
      {state.data && cards.length === 0 && <p className="empty">You have no cards yet.</p>}
      <ul className="card-list">
        {cards.map((card) => {
          const frozen = card.status === 'frozen';
          const label = `${card.brand === 'visa' ? 'Visa' : 'Mastercard'} ${card.virtual ? 'virtual card' : 'debit card'} ending ${card.maskedPan.slice(-4)}`;
          return (
            <li key={card.id} className="card card-item">
              <div
                className={`payment-card ${frozen ? 'payment-card--frozen' : ''}`}
                role="img"
                aria-label={label}
              >
                <span className="payment-card__top">
                  <span>{card.virtual ? 'Virtual' : 'Debit'}</span>
                  {card.virtual && <span className="badge badge--light">Virtual</span>}
                </span>
                <span className="payment-card__pan">{card.maskedPan}</span>
                <span className="payment-card__bottom">
                  <span>{card.expiry}</span>
                  <span className="payment-card__brand">
                    {card.brand === 'visa' ? 'VISA' : 'mastercard'}
                  </span>
                </span>
              </div>
              <div className="card-item__controls">
                <div>
                  <p id={`${card.id}-label`} className="card-item__title">
                    {label}
                  </p>
                  <StatusPill status={card.status} />
                </div>
                <button
                  role="switch"
                  aria-checked={frozen}
                  aria-describedby={`${card.id}-label`}
                  className="switch"
                  disabled={pending === card.id || card.status === 'blocked'}
                  onClick={() => toggleFreeze(card)}
                >
                  <span className="switch__track" aria-hidden="true">
                    <span className="switch__thumb" />
                  </span>
                  Freeze card
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
