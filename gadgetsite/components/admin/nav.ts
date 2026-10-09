import type { PermissionCode } from '@/lib/admin/guard'

/** Sidebar entries; each shows only to admins holding its permission. */
export const NAV: { key: string; href: string; permission?: PermissionCode; group: string }[] = [
  { key: 'dashboard', href: '/admin', group: 'main' },
  { key: 'products', href: '/admin/products', permission: 'catalog.read', group: 'catalog' },
  { key: 'bulk', href: '/admin/products/bulk', permission: 'catalog.write', group: 'catalog' },
  { key: 'categories', href: '/admin/categories', permission: 'catalog.read', group: 'catalog' },
  { key: 'brands', href: '/admin/brands', permission: 'catalog.read', group: 'catalog' },
  { key: 'badges', href: '/admin/badges', permission: 'catalog.read', group: 'catalog' },
  { key: 'carePlans', href: '/admin/care-plans', permission: 'catalog.read', group: 'catalog' },
  { key: 'footer', href: '/admin/content/footer', permission: 'content.write', group: 'content' },
  { key: 'customers', href: '/admin/customers', permission: 'customers.read', group: 'people' },
  { key: 'users', href: '/admin/users', permission: 'users.manage', group: 'people' },
  { key: 'roles', href: '/admin/roles', permission: 'users.manage', group: 'people' },
  { key: 'settings', href: '/admin/settings', permission: 'settings.write', group: 'system' },
  {
    key: 'services',
    href: '/admin/settings/services',
    permission: 'settings.write',
    group: 'system',
  },
  { key: 'audit', href: '/admin/audit', permission: 'audit.read', group: 'system' },
]
