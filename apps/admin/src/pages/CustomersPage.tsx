import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { useAdmin } from '../api/AdminContext';
import { useAsync } from '../api/useAsync';

/** Customer search (PRD FR-22, global search in §4.8). */
export function CustomersPage() {
  const { api } = useAdmin();
  const [query, setQuery] = useState('');
  const state = useAsync(useCallback(() => api.listCustomers(query), [api, query]));

  return (
    <div className="admin-page">
      <h1>Customers</h1>
      <input
        className="search"
        type="search"
        placeholder="Search by name, customer ID or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search customers"
      />
      <table className="table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Legal name</th>
            <th>Email</th>
            <th>KYC</th>
          </tr>
        </thead>
        <tbody>
          {(state.data ?? []).map((c) => (
            <tr key={c.id}>
              <td className="mono">
                <Link to={`/customers/${c.id}`} className="link">
                  {c.id}
                </Link>
              </td>
              <td>{c.legalName}</td>
              <td>{c.email}</td>
              <td>
                <span className={`kyc kyc--${c.kycStatus}`}>{c.kycStatus}</span>
              </td>
            </tr>
          ))}
          {state.data?.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No customers match “{query}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
