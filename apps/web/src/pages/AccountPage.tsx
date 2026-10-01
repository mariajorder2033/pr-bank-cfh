import { formatIban } from '@pr-bank/domain';
import { useCallback, useId, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useBackend } from '../api/BackendContext';
import { ApiError } from '../api/types';
import { useAsync } from '../api/useAsync';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { TransactionList } from '../components/TransactionList';
import { usePageTitle } from '../usePageTitle';

/** Start of a local calendar day as an ISO instant; `offsetDays` shifts it. */
function localDayStart(date: string, offsetDays = 0): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d + offsetDays).toISOString();
}

/** Account details and transaction history with a date filter (PRD FR-5, FR-6, FR-75). */
export function AccountPage() {
  const { accountId = '' } = useParams();
  const { api } = useBackend();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromId = useId();
  const toId = useId();

  const load = useCallback(async () => {
    const account = (await api.listAccounts()).find((a) => a.id === accountId);
    if (!account) {
      throw new ApiError(404, 'not_found', 'Not found');
    }
    const transactions = await api.listTransactions(accountId, {
      from: from ? localDayStart(from) : undefined,
      to: to ? localDayStart(to, 1) : undefined,
      limit: 200,
    });
    return { account, transactions };
  }, [api, accountId, from, to]);
  const state = useAsync(load);
  usePageTitle(state.data?.account.name ?? 'Account');

  if (state.status === 'error' && !state.data) {
    const notFound = state.error instanceof ApiError && state.error.status === 404;
    return (
      <div className="page">
        <p className="alert" role="alert">
          {notFound ? 'This account was not found.' : 'This account could not be loaded.'}{' '}
          <Link to="/" className="link">
            Back to home
          </Link>
        </p>
      </div>
    );
  }

  const account = state.data?.account;
  return (
    <div className="page" aria-busy={state.status === 'loading'}>
      <Link to="/" className="back-link">
        <Icon name="back" size={18} /> Home
      </Link>
      <h1 className="page__title">{account?.name ?? 'Account'}</h1>
      {account && (
        <section className="card account-detail" aria-label="Account details">
          <dl className="details">
            <div>
              <dt>IBAN</dt>
              <dd className="mono">{formatIban(account.iban)}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd className="details__big">
                <Money value={account.bookedBalance} />
              </dd>
            </div>
            <div>
              <dt>Available</dt>
              <dd>
                <Money value={account.availableBalance} />
              </dd>
            </div>
          </dl>
          <p className="protection">
            <Icon name="shield" size={18} />
            Deposits are protected up to CHF 100,000 per customer by esisuisse.
          </p>
        </section>
      )}

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="section-title">
          Transactions
        </h2>
        <div className="filters">
          <div className="field field--inline">
            <label htmlFor={fromId}>From</label>
            <input
              id={fromId}
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="field field--inline">
            <label htmlFor={toId}>To</label>
            <input
              id={toId}
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {(from || to) && (
            <button
              className="button button--secondary"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              Clear dates
            </button>
          )}
        </div>
        {state.data && (
          <div className="card">
            <TransactionList
              transactions={state.data.transactions}
              empty={from || to ? 'No transactions in this period.' : 'No transactions yet.'}
            />
          </div>
        )}
      </section>
    </div>
  );
}
