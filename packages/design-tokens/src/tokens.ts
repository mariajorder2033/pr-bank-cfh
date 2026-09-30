/**
 * Design tokens from ui-ux-design.md §2. This file is the single source; CSS and JSON
 * outputs are generated from it (§8: shared across web and mobile).
 *
 * The primary colour is a deep-navy placeholder until the brand team decides (§2.1).
 */

export const COLOR_ROLES = [
  'primary',
  'on-primary',
  'background',
  'surface',
  'text-primary',
  'text-secondary',
  'border',
  'success',
  'danger',
  'warning',
  'encrypted',
] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];
export type ThemeName = 'light' | 'dark';

export const colors: Readonly<Record<ThemeName, Readonly<Record<ColorRole, string>>>> = {
  light: {
    primary: '#1B2A4A',
    'on-primary': '#FFFFFF',
    background: '#F6F6F4',
    surface: '#FFFFFF',
    'text-primary': '#14171F',
    'text-secondary': '#555C69',
    border: '#7D838E',
    success: '#1A7342',
    danger: '#B42318',
    warning: '#8A5300',
    encrypted: '#5B2A86',
  },
  dark: {
    primary: '#9DB8F2',
    'on-primary': '#0B1530',
    background: '#1E2126',
    surface: '#131519',
    'text-primary': '#F2F3F5',
    'text-secondary': '#A9AFBA',
    border: '#6B717C',
    success: '#5CC98F',
    danger: '#FF8A7F',
    warning: '#F2B84B',
    encrypted: '#BFA6FF',
  },
};

export const typography = {
  fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  /** Tabular figures wherever money is shown, so amounts align in columns. */
  moneyNumeric: 'tabular-nums',
  sizePx: { display: 32, h1: 24, h2: 20, body: 16, caption: 13 },
  lineHeight: { tight: 1.4, normal: 1.5 },
} as const;

/** 8px base unit; all spacing is a multiple of it. */
export const SPACING_UNIT_PX = 8;
export const spacingPx = [1, 2, 3, 4, 5, 6, 7, 8].map((step) => step * SPACING_UNIT_PX);

export const layout = {
  mobileGutterPx: 16,
  maxContentWidthPx: 1200,
  minTouchTargetPx: 44,
} as const;

export const motion = {
  durationMs: 200,
} as const;
