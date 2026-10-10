import { db } from '@/lib/db'
import { ProductQueryInput, type ProductQuery } from '@/lib/content/schemas'
import { emiOptions, type EmiOption, type EmiRate } from '@/lib/domain/emi'
import { discountPercent, effectivePrice } from '@/lib/domain/pricing'
import { stockStatus, type StockStatus } from '@/lib/domain/stock'
import type { Prisma } from '@/lib/generated/prisma/client'
import { isSlug } from '@/lib/domain/slug'
import { bilingual, type Bilingual } from '@/lib/i18n'

// Storefront read path (spec §6.1). Everything shoppers see about price and stock is
// computed here from the database: discount, EMI and stock status are never stored.

export type ProductCard = {
  slug: string
  title: Bilingual
  brand: { slug: string; name: Bilingual }
  offerPrice: number
  regularPrice: number
  discountPercent: number
  stockStatus: StockStatus
  image: string
  badges: { code: string; label: Bilingual; color: string }[]
  variantId: string
  /** A timed sale is setting the shown price. */
  onSale: boolean
  /** ISO end of that sale, if it has one. */
  saleEndsAt: string | null
  /** Category slug, used to filter the cached catalog in memory. */
  categorySlug: string
}

export type ProductVariant = {
  id: string
  sku: string
  color: string | null
  storage: string | null
  ram: string | null
  region: string | null
  offerPrice: number
  regularPrice: number
  discountPercent: number
  available: number
  stockStatus: StockStatus
  images: string[]
  onSale: boolean
  saleEndsAt: string | null
}

export type EmiBank = {
  bank: Bilingual
  logoUrl: string | null
  minAmount: number
  rates: EmiRate[]
}

/** A bank's EMI for one price; `rates` let the product page recompute per variant. */
export type EmiBankOffer = EmiBank & { options: EmiOption[] }

export type ProductDetail = ProductCard & {
  descriptionHtml: Bilingual
  warranty: Bilingual
  preorder: boolean
  bookingAmount: number | null
  variants: ProductVariant[]
  carePlans: { id: string; name: Bilingual; price: number; coverageMonths: number }[]
  emi: EmiBankOffer[]
  category: { slug: string; name: Bilingual }
}

export type ProductQueryInputArg = ProductQueryInput

const PLACEHOLDER_IMAGE = '/ph.svg'

const cardInclude = {
  brand: true,
  category: { select: { slug: true } },
  variants: { orderBy: { sort: 'asc' } },
  badges: { include: { badge: true } },
} satisfies Prisma.ProductInclude

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>

/** Units held by active, unexpired checkout reservations, per variant. */
async function heldByVariant(variantIds: string[], now: Date): Promise<Map<string, number>> {
  if (!variantIds.length) return new Map()
  const rows = await db.stockReservation.groupBy({
    by: ['variantId'],
    where: { variantId: { in: variantIds }, status: 'active', expiresAt: { gt: now } },
    _sum: { qty: true },
  })
  return new Map(rows.map((r) => [r.variantId, r._sum.qty ?? 0]))
}

function toVariants(row: CardRow, held: Map<string, number>, now: Date): ProductVariant[] {
  return row.variants.map((v) => {
    const available = Math.max(0, v.stock - (held.get(v.id) ?? 0))
    const sale = effectivePrice(v, now)
    return {
      id: v.id,
      sku: v.sku,
      color: v.color,
      storage: v.storage,
      ram: v.ram,
      region: v.region,
      offerPrice: sale.price,
      regularPrice: v.regularPrice,
      discountPercent: discountPercent(v.regularPrice, sale.price),
      available,
      stockStatus: stockStatus(available, {
        lowThreshold: row.lowStockThreshold,
        preorder: row.preorder,
      }),
      images: v.images,
      onSale: sale.onSale,
      saleEndsAt: sale.saleEndsAt?.toISOString() ?? null,
    }
  })
}

/** The variant a card shows: cheapest with stock, else cheapest overall. */
function shownVariant(variants: ProductVariant[]): ProductVariant | undefined {
  const byPrice = [...variants].sort((a, b) => a.offerPrice - b.offerPrice)
  return byPrice.find((v) => v.available > 0) ?? byPrice[0]
}

function toCard(row: CardRow, variants: ProductVariant[]): ProductCard | null {
  const v = shownVariant(variants)
  if (!v) return null
  return {
    slug: row.slug,
    title: bilingual(row, 'title'),
    brand: { slug: row.brand.slug, name: bilingual(row.brand, 'name') },
    offerPrice: v.offerPrice,
    regularPrice: v.regularPrice,
    discountPercent: v.discountPercent,
    stockStatus: v.stockStatus,
    image: v.images[0] ?? PLACEHOLDER_IMAGE,
    badges: row.badges.map(({ badge }) => ({
      code: badge.code,
      label: bilingual(badge, 'label'),
      color: badge.color,
    })),
    variantId: v.id,
    onSale: v.onSale,
    saleEndsAt: v.saleEndsAt,
    categorySlug: row.category.slug,
  }
}

async function toCards(rows: CardRow[], now: Date): Promise<ProductCard[]> {
  const held = await heldByVariant(
    rows.flatMap((r) => r.variants.map((v) => v.id)),
    now,
  )
  return rows.flatMap((row) => {
    const card = toCard(row, toVariants(row, held, now))
    return card ? [card] : []
  })
}

const SORTERS: Record<ProductQuery['sort'], (a: ProductCard, b: ProductCard) => number> = {
  newest: () => 0, // rows are already newest first
  price_asc: (a, b) => a.offerPrice - b.offerPrice,
  price_desc: (a, b) => b.offerPrice - a.offerPrice,
  discount: (a, b) => b.discountPercent - a.discountPercent,
}

/** Shoppers only see active products of active brands in active categories. */
const VISIBLE: Prisma.ProductWhereInput = {
  status: 'active',
  brand: { active: true },
  category: { active: true },
}

/** Every visible product as a card, newest first: one bounded unit to cache. */
export async function allCards(now = new Date()): Promise<ProductCard[]> {
  const rows = await db.product.findMany({
    where: VISIBLE,
    include: cardInclude,
    orderBy: { createdAt: 'desc' },
  })
  return toCards(rows, now)
}

type CategoryNode = { slug: string; parentSlug: string | null }

/** The category and all its descendants. */
function categoryScope(slug: string, categories: CategoryNode[]): Set<string> {
  const scope = new Set([slug])
  let grew = true
  while (grew) {
    grew = false
    for (const c of categories) {
      if (c.parentSlug && scope.has(c.parentSlug) && !scope.has(c.slug)) {
        scope.add(c.slug)
        grew = true
      }
    }
  }
  return scope
}

/**
 * Applies a storefront query to cards in memory. Price, stock and sort depend on the
 * computed card, and filtering in memory keeps the data cache to one entry per catalog.
 */
export function filterCards(
  cards: ProductCard[],
  input: ProductQueryInput,
  categories: CategoryNode[],
): { items: ProductCard[]; total: number } {
  const parsed = ProductQueryInput.safeParse(input)
  if (!parsed.success) return { items: [], total: 0 }
  const q = parsed.data
  if (q.min !== undefined && q.max !== undefined && q.min > q.max) return { items: [], total: 0 }
  let scope: Set<string> | null = null
  if (q.category) {
    if (!categories.some((c) => c.slug === q.category)) return { items: [], total: 0 }
    scope = categoryScope(q.category, categories)
  }
  const brands = q.brands?.length ? new Set(q.brands) : null
  const matches = cards
    .filter((c) => !scope || scope.has(c.categorySlug))
    .filter((c) => !brands || brands.has(c.brand.slug))
    .filter((c) => !q.badge || c.badges.some((b) => b.code === q.badge))
    .filter((c) => q.min === undefined || c.offerPrice >= q.min)
    .filter((c) => q.max === undefined || c.offerPrice <= q.max)
    .filter((c) => !q.inStock || c.stockStatus === 'in_stock' || c.stockStatus === 'few_left')
    .sort(SORTERS[q.sort])
  const start = (q.page - 1) * q.pageSize
  return { items: matches.slice(start, start + q.pageSize), total: matches.length }
}

/** Visible products matching a storefront query (uncached; see cached.ts). */
export async function listProducts(
  input: ProductQueryInput,
  now = new Date(),
): Promise<{ items: ProductCard[]; total: number }> {
  const [cards, categories] = await Promise.all([allCards(now), listCategories()])
  return filterCards(cards, input, categories)
}

/** Picks cards by slug, in input order, skipping unknown or invalid slugs (wishlist, compare). */
export function pickCards(cards: ProductCard[], slugs: string[]): ProductCard[] {
  const bySlug = new Map(cards.map((c) => [c.slug, c]))
  return slugs.slice(0, 24).flatMap((slug) => {
    const card = isSlug(slug) ? bySlug.get(slug) : undefined
    return card ? [card] : []
  })
}

export async function getProductsBySlugs(
  slugs: string[],
  now = new Date(),
): Promise<ProductCard[]> {
  return pickCards(await allCards(now), slugs)
}

export async function getProduct(slug: string, now = new Date()): Promise<ProductDetail | null> {
  if (!isSlug(slug)) return null
  const row = await db.product.findFirst({
    where: { slug, ...VISIBLE },
    include: {
      ...cardInclude,
      category: true,
      carePlans: { include: { carePlan: true } },
    },
  })
  if (!row) return null

  const held = await heldByVariant(
    row.variants.map((v) => v.id),
    now,
  )
  const variants = toVariants(row, held, now)
  const card = toCard(row, variants)
  if (!card) return null

  const emi = (await listEmiBanks()).flatMap((bank) => {
    const options = emiOptions(card.offerPrice, bank.rates, bank.minAmount)
    return options.length ? [{ ...bank, options }] : []
  })

  return {
    ...card,
    descriptionHtml: bilingual(row, 'descriptionHtml'),
    warranty: bilingual(row, 'warranty'),
    preorder: row.preorder,
    bookingAmount: row.bookingAmount,
    variants,
    carePlans: row.carePlans.map(({ carePlan }) => ({
      id: carePlan.id,
      name: bilingual(carePlan, 'name'),
      price: carePlan.price,
      coverageMonths: carePlan.coverageMonths,
    })),
    emi,
    category: { slug: row.category.slug, name: bilingual(row.category, 'name') },
  }
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Typo-tolerant search over English titles, plus Bangla titles and brand names. */
export async function searchProducts(term: string, limit = 20): Promise<ProductCard[]> {
  // Control characters (a NUL byte is rejected by PostgreSQL) never reach the query.
  const q = term
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, 100)
    .toLowerCase()
  if (q.length < 2) return []
  const like = `%${escapeLike(q)}%`
  const hits = await db.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM products p
    JOIN brands b ON b.id = p."brandId"
    JOIN categories c ON c.id = p."categoryId"
    WHERE p.status = 'active' AND b.active AND c.active
      AND (
        word_similarity(${q}, lower(p."titleEn")) > 0.3
        OR p."titleBn" ILIKE ${like}
        OR lower(b."nameEn") LIKE ${like}
        OR b."nameBn" ILIKE ${like}
      )
    ORDER BY word_similarity(${q}, lower(p."titleEn")) DESC, p."createdAt" DESC
    LIMIT ${limit}
  `
  if (!hits.length) return []
  const rows = await db.product.findMany({
    where: { id: { in: hits.map((h) => h.id) } },
    include: cardInclude,
  })
  const order = new Map(hits.map((h, i) => [h.id, i]))
  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!)
  return toCards(rows, new Date())
}

export async function listCategories(): Promise<
  { slug: string; name: Bilingual; parentSlug: string | null }[]
> {
  const rows = await db.category.findMany({
    where: { active: true },
    include: { parent: { select: { slug: true } } },
    orderBy: { sort: 'asc' },
  })
  return rows.map((c) => ({
    slug: c.slug,
    name: bilingual(c, 'name'),
    parentSlug: c.parent?.slug ?? null,
  }))
}

export async function getCategory(slug: string): Promise<{ slug: string; name: Bilingual } | null> {
  if (!isSlug(slug)) return null
  const c = await db.category.findUnique({ where: { slug } })
  return c && c.active ? { slug: c.slug, name: bilingual(c, 'name') } : null
}

export async function listBrands(): Promise<
  { slug: string; name: Bilingual; logoUrl: string | null; productCount: number }[]
> {
  const rows = await db.brand.findMany({
    where: { active: true },
    include: { _count: { select: { products: { where: { status: 'active' } } } } },
    orderBy: { sort: 'asc' },
  })
  return rows.map((b) => ({
    slug: b.slug,
    name: bilingual(b, 'name'),
    logoUrl: b.logoUrl,
    productCount: b._count.products,
  }))
}

/** EMI banks with their website-payment rates (rates come only from admin, TRD §5). */
export async function listEmiBanks(): Promise<EmiBank[]> {
  const banks = await db.emiBank.findMany({
    include: { rates: { where: { type: 'website' }, orderBy: { tenureMonths: 'asc' } } },
    orderBy: { nameEn: 'asc' },
  })
  return banks.map((bank) => ({
    bank: bilingual(bank, 'name'),
    logoUrl: bank.logoUrl,
    minAmount: bank.minAmount,
    rates: bank.rates.map((r) => ({ tenureMonths: r.tenureMonths, percent: Number(r.percent) })),
  }))
}
