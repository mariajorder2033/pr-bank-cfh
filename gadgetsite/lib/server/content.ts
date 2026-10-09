import { db } from '@/lib/db'
import { defaultDelivery, defaultMotion, defaultSite, defaultTheme } from '@/lib/content/defaults'
import {
  DeliverySettings,
  MenuItem,
  MotionSettings,
  SiteSettings,
  ThemeSettings,
  parseSections,
  parseSetting,
  type Section,
} from '@/lib/content/schemas'
import { bilingual, type Bilingual } from '@/lib/i18n'

// Admin-managed content for the storefront chrome and CMS pages (spec §6.1).

export type StoreSettings = {
  site: SiteSettings
  motion: MotionSettings
  delivery: DeliverySettings
  theme: ThemeSettings
}

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.setting.findMany({
    where: { key: { in: ['site', 'motion', 'delivery', 'theme'] } },
  })
  const value = (key: string) => rows.find((r) => r.key === key)?.value
  return {
    site: parseSetting(SiteSettings, value('site'), defaultSite),
    motion: parseSetting(MotionSettings, value('motion'), defaultMotion),
    delivery: parseSetting(DeliverySettings, value('delivery'), defaultDelivery),
    theme: parseSetting(ThemeSettings, value('theme'), defaultTheme),
  }
}

function parseItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((i) => {
    const parsed = MenuItem.safeParse(i)
    return parsed.success ? [parsed.data] : []
  })
}

export async function getMenu(location: string): Promise<MenuItem[]> {
  const menu = await db.menu.findUnique({ where: { location } })
  return parseItems(menu?.items)
}

export type MegaMenu = {
  categorySlug: string
  name: Bilingual
  layout: 'cols3' | 'cols2' | 'cols6' | 'list'
  rowsPerCol: number
  items: MenuItem[]
}

export async function getMegaMenus(): Promise<MegaMenu[]> {
  const rows = await db.megaMenu.findMany({
    where: { category: { active: true } },
    include: { category: true },
    orderBy: [{ category: { sort: 'asc' } }, { sort: 'asc' }],
  })
  return rows.map((m) => ({
    categorySlug: m.category.slug,
    name: bilingual(m.category, 'name'),
    layout: m.layout,
    rowsPerCol: m.rowsPerCol,
    items: parseItems(m.items),
  }))
}

export type ExploreBrand = { slug: string; name: Bilingual; logoUrl: string | null }

export async function getExploreBrands(): Promise<Record<string, ExploreBrand[]>> {
  const rows = await db.exploreBrand.findMany({
    where: { brand: { active: true }, category: { active: true } },
    include: { brand: true, category: { select: { slug: true } } },
    orderBy: { sort: 'asc' },
  })
  const out: Record<string, ExploreBrand[]> = {}
  for (const r of rows) {
    ;(out[r.category.slug] ??= []).push({
      slug: r.brand.slug,
      name: bilingual(r.brand, 'name'),
      logoUrl: r.brand.logoUrl,
    })
  }
  return out
}

const live = (row: { publishAt: Date | null; expireAt: Date | null }, now: Date) =>
  (!row.publishAt || row.publishAt <= now) && (!row.expireAt || row.expireAt > now)

export async function getLayout(page: string, now = new Date()): Promise<Section[]> {
  const layout = await db.layout.findUnique({ where: { page } })
  return layout && live(layout, now) ? parseSections(layout.sections) : []
}

export type Banner = {
  id: string
  image: Bilingual
  alt: Bilingual
  link: string | null
  devices: string[]
}

export async function getBanners(placement: string, now = new Date()): Promise<Banner[]> {
  const rows = await db.banner.findMany({ where: { placement }, orderBy: { sort: 'asc' } })
  return rows
    .filter((b) => live(b, now))
    .map((b) => ({
      id: b.id,
      image: bilingual(b, 'imageUrl'),
      alt: bilingual(b, 'alt'),
      link: b.link,
      devices: b.devices,
    }))
}

export async function getTicker(): Promise<{ text: Bilingual; link: string | null }[]> {
  const rows = await db.tickerItem.findMany({ orderBy: { sort: 'asc' } })
  return rows.map((t) => ({ text: bilingual(t, 'text'), link: t.link }))
}

export type CmsPage = {
  slug: string
  title: Bilingual
  bodyHtml: Bilingual
  kind: 'policy' | 'about' | 'blog' | 'custom'
  /** ISO string, so the page survives the JSON data cache unchanged. */
  publishedAt: string | null
}

const toPage = (p: {
  slug: string
  titleEn: string
  titleBn: string
  bodyHtmlEn: string
  bodyHtmlBn: string
  kind: CmsPage['kind']
  publishedAt: Date | null
}): CmsPage => ({
  slug: p.slug,
  title: bilingual(p, 'title'),
  bodyHtml: bilingual(p, 'bodyHtml'),
  kind: p.kind,
  publishedAt: p.publishedAt?.toISOString() ?? null,
})

/**
 * A page shoppers may see: blog/custom pages once published; policy/about pages once
 * they have a body (they are seeded as empty shells for admin to fill).
 */
export async function getPage(slug: string, now = new Date()): Promise<CmsPage | null> {
  const p = await db.page.findUnique({ where: { slug } })
  if (!p) return null
  const visible =
    p.kind === 'policy' || p.kind === 'about'
      ? p.bodyHtmlEn.trim() !== ''
      : p.publishedAt !== null && p.publishedAt <= now
  return visible ? toPage(p) : null
}

export async function listBlogPosts(now = new Date()): Promise<CmsPage[]> {
  const rows = await db.page.findMany({
    where: { kind: 'blog', publishedAt: { lte: now } },
    orderBy: { publishedAt: 'desc' },
  })
  return rows.map(toPage)
}
