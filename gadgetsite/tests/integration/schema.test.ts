import { afterAll, describe, expect, test } from 'vitest'
import { db } from '@/lib/db'

afterAll(() => db.$disconnect())

const uniqueViolation = { code: 'P2002' }

async function makeCatalog(slug: string) {
  const category = await db.category.create({ data: { slug: `cat-${slug}`, nameEn: 'Phones' } })
  const brand = await db.brand.create({ data: { slug: `brand-${slug}`, nameEn: 'Acme' } })
  return { category, brand }
}

describe('schema', () => {
  test('a product with a variant round-trips', async () => {
    const { category, brand } = await makeCatalog('rt')
    const product = await db.product.create({
      data: {
        slug: 'phone-rt',
        titleEn: 'Phone',
        brandId: brand.id,
        categoryId: category.id,
        variants: { create: { sku: 'RT-1', offerPrice: 85000, regularPrice: 100000, stock: 4 } },
      },
      include: { variants: true },
    })
    expect(product.variants[0].offerPrice).toBe(85000)
    expect(product.titleBn).toBe('')
  })

  test('product slugs are unique', async () => {
    const { category, brand } = await makeCatalog('dup')
    const data = { slug: 'phone-dup', titleEn: 'P', brandId: brand.id, categoryId: category.id }
    await db.product.create({ data })
    await expect(db.product.create({ data })).rejects.toMatchObject(uniqueViolation)
  })

  test('a webhook event is stored at most once per source', async () => {
    const data = { source: 'bkash', eventId: 'evt-1', headers: {}, body: '{}', status: 'received' }
    await db.webhookLog.create({ data })
    await expect(db.webhookLog.create({ data })).rejects.toMatchObject(uniqueViolation)
  })

  test('an idempotency key is stored at most once', async () => {
    const data = { key: 'idem-1', requestHash: 'h' }
    await db.idempotencyKey.create({ data })
    await expect(db.idempotencyKey.create({ data })).rejects.toMatchObject(uniqueViolation)
  })
})
