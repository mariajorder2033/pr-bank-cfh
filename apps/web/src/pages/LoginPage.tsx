import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useSession } from '../auth/SessionContext';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';
import { DEMO_MODE } from '../config';
import { usePageTitle } from '../usePageTitle';

/** Login (ui-ux-design.md §4.2, PRD FR-2). Sign-in is simulated in demo mode. */
export function LoginPage() {
  usePageTitle('Sign in');
  const { session, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (session) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier, password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <Brand />
        <h1 className="login__title">Sign in to e-banking</h1>
        {DEMO_MODE && (
          <p className="notice">
            <Icon name="lock" size={18} />
            <span>
              Demo mode: sign-in is simulated. Enter any username and password; nothing you type
              leaves this browser.
            </span>
          </p>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="identifier">Username, customer number or email</label>
            <input
              id="identifier"
              name="username"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              aria-invalid={error !== null && !identifier.trim()}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error !== null && !password}
            />
          </div>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <button className="button button--primary button--block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
