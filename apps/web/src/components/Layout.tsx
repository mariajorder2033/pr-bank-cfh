import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useSession } from '../auth/SessionContext';
import { DEMO_MODE } from '../config';
import { Brand } from './Brand';
import { Icon, type IconName } from './Icon';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/payments', label: 'Payments', icon: 'payments' },
  { to: '/cards', label: 'Cards', icon: 'cards' },
  { to: '/more', label: 'More', icon: 'more' },
];

/**
 * Signed-in shell. Navigation is a bottom bar on mobile and a sidebar on wider screens
 * (ui-ux-design.md §3). Wealth joins the nav when it ships in Phase 2.
 */
export function Layout() {
  const { session } = useSession();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new page's content after in-app navigation, for screen-reader users.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Brand />
        {DEMO_MODE && <span className="badge">Demo</span>}
        <span className="topbar__user">{session?.displayName}</span>
      </header>
      <nav className="nav" aria-label="Main">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav__link">
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main id="main" ref={main} className="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
