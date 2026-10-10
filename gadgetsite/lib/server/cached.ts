import { unstable_cache } from 'next/cache'
import * as catalog from './catalog'
import * as content from './content'

// Storefront reads go through Next's data cache. Admin writes (Stage 3) call
// revalidateTag(TAGS.x) so changes show up immediately; revalidate is the safety net.
//
// Cache keys must stay bounded: self-hosted Next writes one file per key and never evicts,
// so anonymous input (filters, search terms, unknown slugs) must never become a key.
// Filters run in memory over one cached catalog; per-slug reads are cached only for slugs
// that exist; search is not cached.

export const TAGS = { catalog: 'catalog', content: 'content', settings: 'settings' } as const

const REVALIDATE_S = 300

function cached<A extends unknown[], R>(
  name: string,
  tag: (typeof TAGS)[keyof typeof TAGS],
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return unstable_cache(fn, [name], { tags: [tag], revalidate: REVALIDATE_S })
}

// Reservation-aware stock is fresh to the revalidate window; checkout (Stage 5) always
// re-checks stock on the server.
const allCards = cached('allCards', TAGS.catalog, () => catalog.allCards())
export const listCategories = cached('listCategories', TAGS.catalog, catalog.listCategories)
export const listBrands = cached('listBrands', TAGS.catalog, catalog.listBrands)
export const listEmiBanks = cached('listEmiBanks', TAGS.catalog, catalog.listEmiBanks)

export async function listProducts(q: catalog.ProductQueryInputArg) {
  const [cards, categories] = await Promise.all([allCards(), listCategories()])
  return catalog.filterCards(cards, q, categories)
}

export async function getProductsBySlugs(slugs: string[]) {
  return catalog.pickCards(await allCards(), slugs)
}

/** Uncached: every term is different, so caching would only grow the cache. */
export const searchProducts = (q: string, limit?: number) => catalog.searchProducts(q, limit)

const productBySlug = cached('getProduct', TAGS.catalog, (slug: string) => catalog.getProduct(slug))
export async function getProduct(slug: string) {
  const known = (await allCards()).some((c) => c.slug === slug)
  return known ? productBySlug(slug) : null
}

export async function getCategory(slug: string) {
  const c = (await listCategories()).find((x) => x.slug === slug)
  return c ? { slug: c.slug, name: c.name } : null
}

export const getSettings = cached('getSettings', TAGS.settings, content.getSettings)
export const getMenu = cached('getMenu', TAGS.content, content.getMenu)
export const getFooterLinks = cached('getFooterLinks', TAGS.content, () => content.getFooterLinks())
export const getFooter = cached('getFooter', TAGS.content, () => content.getFooter())
export const getMegaMenus = cached('getMegaMenus', TAGS.content, content.getMegaMenus)
export const getExploreBrands = cached('getExploreBrands', TAGS.content, content.getExploreBrands)
export const getLayout = cached('getLayout', TAGS.content, (page: string) =>
  content.getLayout(page),
)
export const getBanners = cached('getBanners', TAGS.content, (placement: string) =>
  content.getBanners(placement),
)
export const getTicker = cached('getTicker', TAGS.content, content.getTicker)
export const listBlogPosts = cached('listBlogPosts', TAGS.content, () => content.listBlogPosts())

const pageSlugs = cached('listPageSlugs', TAGS.content, content.listPageSlugs)
const pageBySlug = cached('getPage', TAGS.content, (slug: string) => content.getPage(slug))
export async function getPage(slug: string) {
  return (await pageSlugs()).includes(slug) ? pageBySlug(slug) : null
}
