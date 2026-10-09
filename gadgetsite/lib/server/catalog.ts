import { db } from '@/lib/db'
import { ProductQueryInput, type ProductQuery } from '@/lib/content/schemas'
import { emiOptions, type EmiOption } from '@/lib/domain/emi'
import { discountPercent } from '@/lib/domain/pricing'
import { stockStatus, type StockStatus } from '@/lib/domain/stock'
import type { Prisma } from '@/lib/generated/prisma/client'
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
}

export type ProductDetail = ProductCard & {
  descriptionHtml: Bilingual
  warranty: Bilingual
  preorder: boolean
  bookingAmount: number | null
  variants: ProductVariant[]
  carePlans: { id: string; name: Bilingual; price: number; coverageMonths: number }[]
  emi: { bank: Bilingual; logoUrl: string | null; options: EmiOption[] }[]
  category: { slug: string; name: Bilingual }
}

const PLACEHOLDER_IMAGE = '/ph.svg'

const cardInclude = {
  brand: true,
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

function toVariants(row: CardRow, held: Map<string, number>): ProductVariant[] {
  return row.variants.map((v) => {
    const available = Math.max(0, v.stock - (held.get(v.id) ?? 0))
    return {
      id: v.id,
      sku: v.sku,
      color: v.color,
      storage: v.storage,
      ram: v.ram,
      region: v.region,
      offerPrice: v.offerPrice,
      regularPrice: v.regularPrice,
      discountPercent: discountPercent(v.regularPrice, v.offerPrice),
      available,
      stockStatus: stockStatus(available, {
        lowThreshold: row.lowStockThreshold,
        preorder: row.preorder,
      }),
      images: v.images,
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
  }
}

async function toCards(rows: CardRow[], now: Date): Promise<ProductCard[]> {
  const held = await heldByVariant(
    rows.flatMap((r) => r.variants.map((v) => v.id)),
    now,
  )
  return rows.flatMap((row) => {
    const card = toCard(row, toVariants(row, held))
    return card ? [card] : []
  })
}

const SORTERS: Record<ProductQuery['sort'], (a: ProductCard, b: ProductCard) => number> = {
  newest: () => 0, // rows are already newest first
  price_asc: (a, b) => a.offerPrice - b.offerPrice,
  price_desc: (a, b) => b.offerPrice - a.offerPrice,
  discount: (a, b) => b.discountPercent - a.discountPercent,
}

/**
 * Active products matching a storefront query. Price, stock and sort apply to the computed
 * card, so they are filtered after the database query (fine for a single store's catalog).
 */
export async function listProducts(
  input: ProductQueryInput,
  now = new Date(),
): Promise<{ items: ProductCard[]; total: number }> {
  const q = ProductQueryInput.parse(input)
  if (q.min !== undefined && q.max !== undefined && q.min > q.max) return { items: [], total: 0 }

  const where: Prisma.ProductWhereInput = { status: 'active' }
  if (q.category) {
    const category = await db.category.findUnique({
      where: { slug: q.category },
      include: { children: { select: { id: true } } },
    })
    if (!category || !category.active) return { items: [], total: 0 }
    where.categoryId = { in: [category.id, ...category.children.map((c) => c.id)] }
  }
  if (q.brands?.length) where.brand = { slug: { in: q.brands } }
  if (q.badge) where.badges = { some: { badge: { code: q.badge } } }

  const rows = await db.product.findMany({
    where,
    include: cardInclude,
    orderBy: { createdAt: 'desc' },
  })
  const cards = (await toCards(rows, now))
    .filter((c) => q.min === undefined || c.offerPrice >= q.min)
    .filter((c) => q.max === undefined || c.offerPrice <= q.max)
    .filter((c) => !q.inStock || c.stockStatus === 'in_stock' || c.stockStatus === 'few_left')
    .sort(SORTERS[q.sort])
  const start = (q.page - 1) * q.pageSize
  return { items: cards.slice(start, start + q.pageSize), total: cards.length }
}

/** Active products for the given slugs, in input order (wishlist, compare). */
export async function getProductsBySlugs(
  slugs: string[],
  now = new Date(),
): Promise<ProductCard[]> {
  const wanted = slugs.slice(0, 24)
  const rows = await db.product.findMany({
    where: { slug: { in: wanted }, status: 'active' },
    include: cardInclude,
  })
  const cards = new Map((await toCards(rows, now)).map((c) => [c.slug, c]))
  return wanted.flatMap((slug) => {
    const card = cards.get(slug)
    return card ? [card] : []
  })
}

export async function getProduct(slug: string, now = new Date()): Promise<ProductDetail | null> {
  const row = await db.product.findUnique({
    where: { slug },
    include: {
      ...cardInclude,
      category: true,
      carePlans: { include: { carePlan: true } },
    },
  })
  if (!row || row.status !== 'active') return null

  const held = await heldByVariant(
    row.variants.map((v) => v.id),
    now,
  )
  const variants = toVariants(row, held)
  const card = toCard(row, variants)
  if (!card) return null

  const banks = await db.emiBank.findMany({
    include: { rates: { where: { type: 'website' } } },
    orderBy: { nameEn: 'asc' },
  })
  const emi = banks.flatMap((bank) => {
    const rates = bank.rates.map((r) => ({
      tenureMonths: r.tenureMonths,
      percent: Number(r.percent),
    }))
    const options = emiOptions(card.offerPrice, rates, bank.minAmount)
    return options.length ? [{ bank: bilingual(bank, 'name'), logoUrl: bank.logoUrl, options }] : []
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
  const q = term.trim().slice(0, 100).toLowerCase()
  if (q.length < 2) return []
  const like = `%${escapeLike(q)}%`
  const hits = await db.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM products p
    JOIN brands b ON b.id = p."brandId"
    WHERE p.status = 'active'
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
