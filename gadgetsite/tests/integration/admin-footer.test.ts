import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'

vi.mock('next/headers', () => import('../support/admin-mocks').then((m) => m.headersModule))
vi.mock('next/navigation', () => import('../support/admin-mocks').then((m) => m.navigationModule))
vi.mock('next/cache', () => import('../support/admin-mocks').then((m) => m.cacheModule))

import { saveFooter } from '@/lib/admin/actions/footer'
import { db } from '@/lib/db'
import { getFooter } from '@/lib/server/content'
import { seed } from '@/prisma/seed'
import { form, jar, revalidated, signInAs } from '../support/admin-mocks'

beforeAll(() => seed(db))
beforeEach(() => {
  jar.clear()
  revalidated.length = 0
})
afterAll(() => db.$disconnect())

const footerForm = (extra: Record<string, string> = {}) =>
  form({
    'columns.0.title.en': 'Company',
    'columns.0.title.bn': 'কোম্পানি',
    'columns.0.links.0.label.en': 'About us',
    'columns.0.links.0.label.bn': '',
    'columns.0.links.0.href': '/brands',
    'branches.0.name.en': 'Bashundhara City',
    'branches.0.name.bn': '',
    'branches.0.address.en': 'Level 5, Shop 12, Panthapath, Dhaka',
    'branches.0.address.bn': '',
    'branches.0.phone': '01712345678',
    'branches.0.mapUrl': '',
    'socials.0.network': 'facebook',
    'socials.0.url': 'https://facebook.com/gadgetsite',
    'appLinks.0.store': 'google_play',
    'appLinks.0.url': 'https://play.google.com/store/apps/details?id=bd.gadgetsite',
    'copyright.en': 'All rights reserved',
    'copyright.bn': 'সর্বস্বত্ব সংরক্ষিত',
    ...extra,
  })

test('the seeded footer links the policy pages, hidden until they have a body', async () => {
  const row = await db.setting.findUniqueOrThrow({ where: { key: 'footer' } })
  const stored = row.value as { columns: { links: { href: string }[] }[] }
  expect(stored.columns[0].links.map((l) => l.href)).toContain('/terms')
  expect((await getFooter()).columns).toEqual([])
})

test('saving the footer round-trips, audits and refreshes content', async () => {
  await signInAs('content')
  expect((await saveFooter({}, footerForm())).ok).toBe(true)
  const f = await getFooter()
  expect(f.columns[0]).toMatchObject({ title: { en: 'Company' }, links: [{ href: '/brands' }] })
  expect(f.branches[0]).toMatchObject({ name: { en: 'Bashundhara City' }, phone: '01712345678' })
  expect(f.socials).toEqual([{ network: 'facebook', url: 'https://facebook.com/gadgetsite' }])
  expect(revalidated).toContain('content')
  expect(
    await db.auditLog.count({ where: { entity: 'setting', entityId: 'footer' } }),
  ).toBeGreaterThan(0)
})

test('a javascript: link or a non-https social URL is refused', async () => {
  await signInAs('content')
  const r = await saveFooter(
    {},
    footerForm({
      'columns.0.links.0.href': 'javascript:alert(1)',
      'socials.0.url': 'http://facebook.com/x',
    }),
  )
  expect(r.fieldErrors?.['columns.0.links.0.href']).toBeTruthy()
  expect(r.fieldErrors?.['socials.0.url']).toBeTruthy()
})
