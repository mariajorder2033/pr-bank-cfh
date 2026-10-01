import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { useBackend } from '../api/BackendContext';
import { useAsync } from '../api/useAsync';
import { useSession } from '../auth/SessionContext';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { TransactionList } from '../components/TransactionList';
import { sumMoney } from '../format';
import { usePageTitle } from '../usePageTitle';

const HIDE_KEY = 'hide-balances';

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Dashboard (ui-ux-design.md §4.3). */
export function DashboardPage() {
  usePageTitle('Home');
  const { api } = useBackend();
  const { session } = useSession();
  const [hidden, setHidden] = useState(readHidden);

  const load = useCallback(async () => {
    const accounts = await api.listAccounts();
    const histories = await Promise.all(
      accounts.map((a) => api.listTransactions(a.id, { limit: 5 })),
    );
    const recent = histories
      .flat()
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 5);
    return { accounts, recent };
  }, [api]);
  const state = useAsync(load);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(HIDE_KEY, String(next));
    } catch {
      // Not persisted when storage is unavailable.
    }
  }

  const accounts = state.data?.accounts ?? [];
  const primary = accounts.find((a) => a.type === 'current') ?? accounts[0];
  const masked = (
    <span className="money" aria-label="Hidden">
      ••••••
    </span>
  );

  return (
    <div className="page">
      <h1 className="page__title">Hello, {session?.displayName.split(' ')[0]}</h1>

      {state.status === 'error' && !state.data && (
        <p className="alert" role="alert">
          Your accounts could not be loaded.{' '}
          <button className="link" onClick={state.reload}>
            Try again
          </button>
        </p>
      )}

      <section
        className="summary"
        aria-labelledby="total-label"
        aria-busy={state.status === 'loading'}
      >
        <div className="summary__row">
          <h2 id="total-label" className="summary__label">
            Total balance
          </h2>
          <button
            className="icon-button"
            onClick={toggleHidden}
            aria-pressed={hidden}
            aria-label={hidden ? 'Show balances' : 'Hide balances'}
          >
            <Icon name={hidden ? 'eyeOff' : 'eye'} />
          </button>
        </div>
        <p className="summary__amount">
          {state.data ? (
            hidden ? (
              masked
            ) : (
              <Money
                value={sumMoney(
                  accounts.map((a) => a.bookedBalance),
                  'CHF',
                )}
              />
            )
          ) : (
            '…'
          )}
        </p>
        <p className="summary__meta">
          {accounts.length === 1 ? 'Across 1 account' : `Across ${accounts.length} accounts`}
        </p>
      </section>

      <section aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className="section-title">
          Accounts
        </h2>
        <ul className="account-cards">
          {accounts.map((account) => (
            <li key={account.id}>
              <Link to={`/accounts/${account.id}`} className="account-card">
                <span className="account-card__name">{account.name}</span>
                <span className="account-card__iban">•••• {account.iban.slice(-4)}</span>
                <span className="account-card__balance">
                  {hidden ? masked : <Money value={account.bookedBalance} />}
                </span>
                {!hidden && account.availableBalance.amount !== account.bookedBalance.amount && (
                  <span className="account-card__available">
                    Available <Money value={account.availableBalance} />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav className="quick-actions" aria-label="Quick actions">
        <Link to="/payments" className="quick-action">
          <span className="quick-action__icon">
            <Icon name="payments" />
          </span>
          Transfer
        </Link>
        <Link to="/payments?tab=domestic" className="quick-action">
          <span className="quick-action__icon">
            <Icon name="arrowRight" />
          </span>
          Pay someone
        </Link>
        <Link to="/cards" className="quick-action">
          <span className="quick-action__icon">
            <Icon name="cards" />
          </span>
          Cards
        </Link>
      </nav>

      <section aria-labelledby="recent-heading">
        <div className="section-head">
          <h2 id="recent-heading" className="section-title">
            Recent transactions
          </h2>
          {primary && (
            <Link to={`/accounts/${primary.id}`} className="link">
              See all
            </Link>
          )}
        </div>
        {state.data && (
          <div className="card">
            <TransactionList
              transactions={state.data.recent}
              empty="No transactions yet."
              hideAmounts={hidden}
            />
          </div>
        )}
      </section>
    </div>
  );
}
