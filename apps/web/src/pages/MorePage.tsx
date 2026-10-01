import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../auth/SessionContext';
import { Icon } from '../components/Icon';
import { DEMO_MODE } from '../config';
import { applyThemePreference, readThemePreference, type ThemePreference } from '../theme';
import { usePageTitle } from '../usePageTitle';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Same as device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Settings and lower-frequency items (ui-ux-design.md §3 "More"). */
export function MorePage() {
  usePageTitle('More');
  const { session, signOut } = useSession();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(readThemePreference);

  function chooseTheme(next: ThemePreference) {
    setTheme(next);
    applyThemePreference(next);
  }

  return (
    <div className="page">
      <h1 className="page__title">More</h1>

      <section className="card form" aria-labelledby="appearance">
        <fieldset className="radio-group">
          <legend id="appearance" className="section-title">
            Appearance
          </legend>
          {THEMES.map((option) => (
            <label key={option.value} className="radio">
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={theme === option.value}
                onChange={() => chooseTheme(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="card form" aria-labelledby="profile">
        <h2 id="profile" className="section-title">
          Profile and security
        </h2>
        <p>
          Signed in as <strong>{session?.displayName}</strong>
        </p>
        <button
          className="button button--secondary"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </button>
      </section>

      <section className="card form" aria-labelledby="about">
        <h2 id="about" className="section-title">
          About
        </h2>
        <p className="protection">
          <Icon name="shield" size={18} />
          Deposits are protected up to CHF 100,000 per customer by esisuisse.
        </p>
        {DEMO_MODE && (
          <p className="muted">
            This is a demo. Accounts and transactions are sample data held in this browser and reset
            when you reload.
          </p>
        )}
      </section>
    </div>
  );
}
