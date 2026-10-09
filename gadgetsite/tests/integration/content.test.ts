import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { db } from '@/lib/db'
import { getFooterLinks, getLayout, getMegaMenus, getPage, getSettings } from '@/lib/server/content'
import { categories } from '@/prisma/seed-data/catalog'
import { seed } from '@/prisma/seed'

beforeAll(() => seed(db))
afterAll(() => db.$disconnect())

describe('getSettings', () => {
  test('reads the motion defaults', async () => {
    expect((await getSettings()).motion.heroCycleMs).toBe(4850)
  })

  test('falls back to defaults when a stored setting is invalid', async () => {
    const before = await db.setting.findUniqueOrThrow({ where: { key: 'motion' } })
    await db.setting.update({ where: { key: 'motion' }, data: { value: { heroCycleMs: 'bad' } } })
    expect((await getSettings()).motion.heroCycleMs).toBe(4850)
    await db.setting.update({ where: { key: 'motion' }, data: { value: before.value as object } })
  })
})

describe('getLayout', () => {
  test('returns the published sections and none once expired', async () => {
    expect((await getLayout('home')).length).toBeGreaterThan(0)
    await db.layout.update({
      where: { page: 'home' },
      data: { expireAt: new Date(Date.now() - 1000) },
    })
    expect(await getLayout('home')).toEqual([])
    await db.layout.update({ where: { page: 'home' }, data: { expireAt: null } })
  })
})

describe('getPage', () => {
  test('hides a policy page until it has a body', async () => {
    expect(await getPage('privacy-policy')).toBeNull()
    await db.page.update({ where: { slug: 'privacy-policy' }, data: { bodyHtmlEn: '<p>x</p>' } })
    expect(await getPage('privacy-policy')).not.toBeNull()
    await db.page.update({ where: { slug: 'privacy-policy' }, data: { bodyHtmlEn: '' } })
  })
})

test('one mega menu per seeded category', async () => {
  const menus = await getMegaMenus()
  for (const c of categories) expect(menus.map((m) => m.categorySlug)).toContain(c.slug)
})

test('footer links skip CMS pages shoppers cannot see yet', async () => {
  const hrefs = async () => (await getFooterLinks()).map((l) => l.href)
  expect(await hrefs()).not.toContain('/terms')
  await db.page.update({ where: { slug: 'terms' }, data: { bodyHtmlEn: '<p>Terms</p>' } })
  expect(await hrefs()).toContain('/terms')
  await db.page.update({ where: { slug: 'terms' }, data: { bodyHtmlEn: '' } })
})
