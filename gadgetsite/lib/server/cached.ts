import { unstable_cache } from 'next/cache'
import * as catalog from './catalog'
import * as content from './content'

// Storefront reads go through Next's data cache. Admin writes (Stage 3) call
// revalidateTag(TAGS.x) so changes show up immediately; revalidate is the safety net.

export const TAGS = { catalog: 'catalog', content: 'content', settings: 'settings' } as const

const REVALIDATE_S = 300

function cached<A extends unknown[], R>(
  name: string,
  tag: (typeof TAGS)[keyof typeof TAGS],
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return unstable_cache(fn, [name], { tags: [tag], revalidate: REVALIDATE_S })
}

// Catalog reads take no `now` argument here: reservation-aware stock is fresh to the
// revalidate window, and checkout (Stage 5) always re-checks stock on the server.
export const listProducts = cached(
  'listProducts',
  TAGS.catalog,
  (q: catalog.ProductQueryInputArg) => catalog.listProducts(q),
)
export const getProductsBySlugs = cached('getProductsBySlugs', TAGS.catalog, (slugs: string[]) =>
  catalog.getProductsBySlugs(slugs),
)
export const getProduct = cached('getProduct', TAGS.catalog, (slug: string) =>
  catalog.getProduct(slug),
)
export const searchProducts = cached('searchProducts', TAGS.catalog, (q: string, limit?: number) =>
  catalog.searchProducts(q, limit),
)
export const listCategories = cached('listCategories', TAGS.catalog, catalog.listCategories)
export const getCategory = cached('getCategory', TAGS.catalog, catalog.getCategory)
export const listBrands = cached('listBrands', TAGS.catalog, catalog.listBrands)
export const listEmiBanks = cached('listEmiBanks', TAGS.catalog, catalog.listEmiBanks)

export const getSettings = cached('getSettings', TAGS.settings, content.getSettings)
export const getMenu = cached('getMenu', TAGS.content, content.getMenu)
export const getFooterLinks = cached('getFooterLinks', TAGS.content, () => content.getFooterLinks())
export const getMegaMenus = cached('getMegaMenus', TAGS.content, content.getMegaMenus)
export const getExploreBrands = cached('getExploreBrands', TAGS.content, content.getExploreBrands)
export const getLayout = cached('getLayout', TAGS.content, (page: string) =>
  content.getLayout(page),
)
export const getBanners = cached('getBanners', TAGS.content, (placement: string) =>
  content.getBanners(placement),
)
export const getTicker = cached('getTicker', TAGS.content, content.getTicker)
export const getPage = cached('getPage', TAGS.content, (slug: string) => content.getPage(slug))
export const listBlogPosts = cached('listBlogPosts', TAGS.content, () => content.listBlogPosts())
