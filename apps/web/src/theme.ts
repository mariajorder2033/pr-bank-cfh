/** Light/dark theming (FR-62): follow the system unless the customer picks a theme. */
export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'theme';

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
  try {
    if (preference === 'system') {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, preference);
    }
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this page only.
  }
}
