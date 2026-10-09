import type { DeliverySettings, MotionSettings, SiteSettings, ThemeSettings } from './schemas'

// Built-in defaults: seeded into `settings`, and used by the storefront whenever a stored
// value is missing or invalid, so a bad admin edit can never break a page.

export const defaultSite: SiteSettings = {
  nameEn: 'gadgetsite',
  nameBn: 'gadgetsite',
  logoUrl: null,
  phone: null,
}

// TRD §9, measured from the reference recording.
export const defaultMotion: MotionSettings = {
  heroCycleMs: 4850,
  heroSlideMs: 280,
  heroEasing: 'cubic-bezier(.22,.8,.2,1)',
  tickerPxPerS: 78,
  wipeMs: 200,
  tileFadeMs: 280,
}

export const defaultDelivery: DeliverySettings = { freeOver: 999 }

// Design tokens from the reference CLAUDE.md.
export const defaultTheme: ThemeSettings = {
  bg: '#2c2b27',
  surface: '#373330',
  headerFrom: '#302c29',
  headerTo: '#151513',
  panel: '#3a332c',
  sand: '#d2a679',
  activeRow: '#5e5243',
  dot: '#eab51a',
  ink: '#14181b',
  success: '#1a9b3a',
  sale: '#ff6b6b',
}

export const settings = {
  site: defaultSite,
  motion: defaultMotion,
  delivery: defaultDelivery,
  theme: defaultTheme,
}
