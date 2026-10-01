import { formatIban } from '@pr-bank/domain';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAdmin } from '../api/AdminContext';
import { AdminError, type AdminSession, type AdminTransaction } from '../api/types';
import { useAsync } from '../api/useAsync';
import { CorrectionDrawer } from '../components/CorrectionDrawer';
import { formatDateTime, formatMoney } from '../format';

/** Customer and account detail with the transaction correction action (PRD FR-22, FR-25, FR-27a). */
export function CustomerPage({ session }: { session: AdminSession }) {
  const { customerId = '' } = useParams();
  const { api } = useAdmin();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<AdminTransaction | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const customer = useAsync(useCallback(() => api.getCustomer(customerId), [api, customerId]));
  const selectedAccount = accountId ?? customer.data?.accounts[0]?.id ?? null;
  const txns = useAsync(
    useCallback(
      () => (selectedAccount ? api.listTransactions(selectedAccount) : Promise.resolve([])),
      [api, selectedAccount],
    ),
  );

  const canCorrect = session.role === 'ops' || session.role === 'super';

  if (customer.status === 'error') {
    const notFound = customer.error instanceof AdminError && customer.error.status === 404;
    return (
      <div className="admin-page">
        <p className="alert">
          {notFound ? 'Customer not found.' : 'Could not load this customer.'}{' '}
          <Link to="/customers" className="link">
            Back to customers
          </Link>
        </p>
      </div>
    );
  }

  const data = customer.data;
  return (
    <div className="admin-page">
      <Link to="/customers" className="link">
        ← Customers
      </Link>
      <h1>{data?.customer.legalName ?? 'Customer'}</h1>
      {data && (
        <p className="muted">
          <span className="mono">{data.customer.id}</span> · {data.customer.email} · KYC{' '}
          <span className={`kyc kyc--${data.customer.kycStatus}`}>{data.customer.kycStatus}</span>
        </p>
      )}

      {flash && (
        <p className="alert alert--ok" role="status">
          {flash}
        </p>
      )}

      <section>
        <h2 className="h2">Accounts</h2>
        <div className="account-tabs">
          {data?.accounts.map((account) => (
            <button
              key={account.id}
              className={`account-tab ${selectedAccount === account.id ? 'is-active' : ''}`}
              onClick={() => setAccountId(account.id)}
            >
              <strong>{account.name}</strong>
              <span className="mono">{formatIban(account.iban)}</span>
              <span className="account-tab__balance">{formatMoney(account.bookedBalance)}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h2">Transactions</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th className="num">Amount</th>
              <th>Status</th>
              {canCorrect && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {(txns.data ?? []).map((tx) => (
              <tr key={tx.id} className={tx.status === 'reversed' ? 'is-reversed' : ''}>
                <td>{formatDateTime(tx.timestamp)}</td>
                <td className="mono">{tx.type}</td>
                <td>
                  {tx.description}
                  {tx.correctsTransactionId && <span className="tag">linked</span>}
                </td>
                <td className="num">{formatMoney(tx.amount)}</td>
                <td>
                  <span className={`status status--${tx.status}`}>{tx.status}</span>
                </td>
                {canCorrect && (
                  <td className="num">
                    {tx.status === 'completed' && tx.type !== 'TXN-33' && (
                      <button
                        className="button button--secondary button--sm"
                        onClick={() => setCorrecting(tx)}
                      >
                        Correct
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {correcting && (
        <CorrectionDrawer
          transaction={correcting}
          onClose={() => setCorrecting(null)}
          onSubmitted={(summary) => {
            setCorrecting(null);
            setFlash(
              `Correction submitted for approval: ${summary}. A second admin must approve it.`,
            );
          }}
        />
      )}
    </div>
  );
}
