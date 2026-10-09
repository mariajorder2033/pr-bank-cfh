// Roles, settings and provider rows every install needs. No credentials, no EMI rates.

export const permissions = [
  'catalog.read',
  'catalog.write',
  'content.read',
  'content.write',
  'orders.read',
  'orders.write',
  'refunds.write',
  'payments.config',
  'couriers.config',
  'customers.read',
  'users.manage',
  'audit.read',
  'settings.write',
] as const

type PermissionCode = (typeof permissions)[number]

export const roles: Record<string, readonly PermissionCode[]> = {
  owner: permissions,
  manager: permissions.filter((p) => p !== 'users.manage'),
  catalog: ['catalog.read', 'catalog.write', 'content.read'],
  content: ['content.read', 'content.write', 'catalog.read'],
  orders: ['orders.read', 'orders.write', 'customers.read', 'catalog.read'],
  support: ['orders.read', 'customers.read', 'catalog.read'],
  finance: ['orders.read', 'refunds.write', 'payments.config', 'audit.read'],
}

// TRD §9 motion constants and reference CLAUDE.md design tokens; all admin-editable.
export const settings: Record<string, unknown> = {
  site: { nameEn: 'gadgetsite', nameBn: 'gadgetsite', logoUrl: null },
  motion: {
    heroCycleMs: 4850,
    heroSlideMs: 280,
    heroEasing: 'cubic-bezier(.22,.8,.2,1)',
    tickerPxPerS: 78,
    wipeMs: 200,
    tileFadeMs: 280,
  },
  delivery: { freeOver: 999 },
  theme: {
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
  },
}

/** Created disabled in sandbox mode, except the ones that need no gateway. */
export const paymentProviders = [
  { id: 'bkash', enabled: false },
  { id: 'sslcommerz', enabled: false },
  { id: 'aamarpay', enabled: false },
  { id: 'cod', enabled: true },
  { id: 'bank', enabled: false },
]

export const couriers = [
  { id: 'pathao', enabled: false },
  { id: 'steadfast', enabled: false },
  { id: 'redx', enabled: false },
  { id: 'own', enabled: false },
  { id: 'pickup', enabled: true },
]

/** Page shells for admin to fill in; bodies are intentionally empty. */
export const pages = [
  { slug: 'about', titleEn: 'About us', titleBn: 'আমাদের সম্পর্কে', kind: 'about' },
  { slug: 'privacy-policy', titleEn: 'Privacy policy', titleBn: 'গোপনীয়তা নীতি', kind: 'policy' },
  { slug: 'refund-policy', titleEn: 'Refund policy', titleBn: 'রিফান্ড নীতি', kind: 'policy' },
  { slug: 'terms', titleEn: 'Terms and conditions', titleBn: 'শর্তাবলী', kind: 'policy' },
  { slug: 'emi-policy', titleEn: 'EMI policy', titleBn: 'ইএমআই নীতি', kind: 'policy' },
  { slug: 'delivery-policy', titleEn: 'Delivery policy', titleBn: 'ডেলিভারি নীতি', kind: 'policy' },
] as const
