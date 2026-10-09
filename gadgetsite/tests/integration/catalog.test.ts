import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { db } from '@/lib/db'
import { discountPercent } from '@/lib/domain/pricing'
import { emiOptions } from '@/lib/domain/emi'
import {
  getProduct,
  getProductsBySlugs,
  listEmiBanks,
  listProducts,
  searchProducts,
} from '@/lib/server/catalog'
import { seed } from '@/prisma/seed'

const MIN = 60_000

beforeAll(async () => {
  await seed(db)
  const phones = await db.category.findUniqueOrThrow({ where: { slug: 'phones' } })
  const brand = await db.brand.findUniqueOrThrow({ where: { slug: 'apple' } })
  const base = { brandId: brand.id, categoryId: phones.id, titleEn: 'Fixture' }
  await db.product.create({
    data: {
      ...base,
      slug: 't2-draft',
      status: 'draft',
      variants: { create: { sku: 'T2-DRAFT', offerPrice: 1000, regularPrice: 1000, stock: 5 } },
    },
  })
  await db.product.create({
    data: {
      ...base,
      slug: 't2-held',
      status: 'active',
      variants: { create: { sku: 'T2-HELD', offerPrice: 1000, regularPrice: 1200, stock: 2 } },
    },
  })
})

afterAll(() => db.$disconnect())

async function holdAll(minutesFromNow: number) {
  const variant = await db.variant.findUniqueOrThrow({ where: { sku: 'T2-HELD' } })
  await db.stockReservation.deleteMany({ where: { variantId: variant.id } })
  await db.stockReservation.create({
    data: {
      variantId: variant.id,
      qty: 2,
      sessionId: 's',
      expiresAt: new Date(Date.now() + minutesFromNow * 60_000),
    },
  })
}

describe('listProducts', () => {
  test('lists active phones with computed discounts', async () => {
    const phones = await db.category.findUniqueOrThrow({ where: { slug: 'phones' } })
    const active = await db.product.count({ where: { categoryId: phones.id, status: 'active' } })
    const { items, total } = await listProducts({ category: 'phones', pageSize: 48 })
    expect(total).toBe(active)
    for (const p of items) {
      expect(p.discountPercent).toBe(discountPercent(p.regularPrice, p.offerPrice))
    }
  })

  test('an inverted price range is empty, not an error', async () => {
    expect(await listProducts({ min: 100_000, max: 50_000 })).toEqual({ items: [], total: 0 })
  })

  test('sorts by price ascending', async () => {
    const { items } = await listProducts({ brands: ['apple'], sort: 'price_asc' })
    const prices = items.map((p) => p.offerPrice)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  test('never shows draft products', async () => {
    const { items } = await listProducts({ category: 'phones', pageSize: 48 })
    expect(items.map((p) => p.slug)).not.toContain('t2-draft')
    expect(await getProduct('t2-draft')).toBeNull()
  })

  test('treats stock held by an active reservation as unavailable', async () => {
    await holdAll(10)
    expect((await getProduct('t2-held'))!.stockStatus).toBe('out_of_stock')
    await holdAll(-10)
    expect((await getProduct('t2-held'))!.stockStatus).toBe('few_left')
  })
})

describe('getProduct', () => {
  test('returns null for an unknown slug', async () => {
    expect(await getProduct('does-not-exist')).toBeNull()
  })

  test('marks a pre-order product with its booking amount', async () => {
    const p = await getProduct('galaxy-buds3-pro')
    expect(p).toMatchObject({ preorder: true, bookingAmount: 5000, stockStatus: 'preorder' })
  })

  test('computes EMI only from rates in the database', async () => {
    expect((await getProduct('iphone-16-pro'))!.emi).toEqual([])
    const bank = await db.emiBank.create({
      data: {
        nameEn: 'Fixture Bank',
        minAmount: 5000,
        rates: { create: { tenureMonths: 12, percent: 9, type: 'website' } },
      },
    })
    const p = (await getProduct('iphone-16-pro'))!
    expect(p.emi).toHaveLength(1)
    expect(p.emi[0].options).toEqual(
      emiOptions(p.offerPrice, [{ tenureMonths: 12, percent: 9 }], 5000),
    )
    expect(p.emi[0]).toMatchObject({ minAmount: 5000, rates: [{ tenureMonths: 12, percent: 9 }] })
    const banks = await listEmiBanks()
    expect(banks).toContainEqual(
      expect.objectContaining({ minAmount: 5000, rates: [{ tenureMonths: 12, percent: 9 }] }),
    )
    await db.emiBank.delete({ where: { id: bank.id } })
  })
})

describe('searchProducts', () => {
  test('tolerates a typo', async () => {
    const slugs = (await searchProducts('galxy')).map((p) => p.slug)
    expect(slugs).toContain('galaxy-s25-ultra')
  })

  test('survives a NUL byte and other control characters', async () => {
    await expect(searchProducts('ab\u0000cd')).resolves.toBeInstanceOf(Array)
    await expect(searchProducts('_')).resolves.toEqual([])
    await expect(searchProducts('')).resolves.toEqual([])
  })

  test('survives hostile input', async () => {
    await expect(searchProducts('%')).resolves.toBeInstanceOf(Array)
    await expect(searchProducts("'; drop table products;--")).resolves.toBeInstanceOf(Array)
    await expect(searchProducts('x'.repeat(500))).resolves.toBeInstanceOf(Array)
  })

  test('returns nothing for blank input', async () => {
    expect(await searchProducts(' ')).toEqual([])
  })
})

test('getProductsBySlugs keeps input order and skips unknown slugs', async () => {
  const items = await getProductsBySlugs(['pixel-9', 'nope', 'iphone-16-pro'])
  expect(items.map((p) => p.slug)).toEqual(['pixel-9', 'iphone-16-pro'])
})

test('price filter applies to the shown offer price', async () => {
  const { items } = await listProducts({ min: MIN, pageSize: 48 })
  expect(items.length).toBeGreaterThan(0)
  for (const p of items) expect(p.offerPrice).toBeGreaterThanOrEqual(MIN)
})

describe('untrusted slugs', () => {
  test('a NUL byte in a slug or filter is a miss, not a database error', async () => {
    expect(await getProduct('a\u0000b')).toBeNull()
    expect(await getProductsBySlugs(['a\u0000b', 'pixel-9'])).toHaveLength(1)
    await expect(listProducts({ brands: ['a\u0000b'] })).resolves.toEqual({ items: [], total: 0 })
    await expect(listProducts({ category: 'a\u0000b' })).resolves.toEqual({ items: [], total: 0 })
  })
})

describe('inactive brands and categories', () => {
  test('hide their products everywhere', async () => {
    await db.brand.update({ where: { slug: 'jbl' }, data: { active: false } })
    try {
      const all = await listProducts({ pageSize: 48 })
      expect(all.items.map((p) => p.slug)).not.toContain('jbl-flip-6')
      expect(await getProduct('jbl-flip-6')).toBeNull()
      expect((await searchProducts('flip')).map((p) => p.slug)).not.toContain('jbl-flip-6')
    } finally {
      await db.brand.update({ where: { slug: 'jbl' }, data: { active: true } })
    }
  })
})

test('a fully held product shows out of stock on its card', async () => {
  await holdAll(10)
  const { items } = await listProducts({ category: 'phones', pageSize: 48 })
  expect(items.find((p) => p.slug === 't2-held')!.stockStatus).toBe('out_of_stock')
  await holdAll(-10)
})
