import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('next/headers', () => import('../support/admin-mocks').then((m) => m.headersModule))
vi.mock('next/navigation', () => import('../support/admin-mocks').then((m) => m.navigationModule))
vi.mock('next/cache', () => import('../support/admin-mocks').then((m) => m.cacheModule))

import { bulkSaveVariants, saveProduct } from '@/lib/admin/actions/products'
import { db } from '@/lib/db'
import { seed } from '@/prisma/seed'
import { form, jar, revalidated, signInAs } from '../support/admin-mocks'

let categoryId = ''
let brandId = ''
beforeAll(async () => {
  await seed(db)
  categoryId = (await db.category.findUniqueOrThrow({ where: { slug: 'phones' } })).id
  brandId = (await db.brand.findUniqueOrThrow({ where: { slug: 'apple' } })).id
})
beforeEach(() => {
  jar.clear()
  revalidated.length = 0
})
afterAll(() => db.$disconnect())

function productForm(
  slug: string,
  variants: Record<string, string | string[]>[],
  extra: Record<string, string | string[]> = {},
) {
  const fields: Record<string, string | string[]> = {
    slug,
    titleEn: 'Admin Phone',
    titleBn: '',
    brandId,
    categoryId,
    status: 'active',
    lowStockThreshold: '3',
    bookingAmount: '',
    warrantyEn: '1 year',
    warrantyBn: '',
    descriptionHtmlEn: '<p>ok</p><script>alert(1)</script>',
    descriptionHtmlBn: '',
    ...extra,
  }
  variants.forEach((v, i) => {
    for (const [k, val] of Object.entries({
      sku: `${slug}-${i}`,
      color: '',
      storage: '',
      ram: '',
      region: '',
      salePrice: '',
      saleStartsAt: '',
      saleEndsAt: '',
      stock: '5',
      ...v,
    })) {
      fields[`variants.${i}.${k}`] = val
    }
  })
  return form(fields)
}

describe('product editor', () => {
  test('a new product with two variants is saved in one audited write', async () => {
    await signInAs('catalog')
    const r = await saveProduct(
      {},
      productForm('admin-phone-1', [
        { offerPrice: '50000', regularPrice: '55000' },
        { offerPrice: '60000', regularPrice: '65000', images: ['/uploads/2026/10/a.webp'] },
      ]),
    )
    expect(r.ok).toBe(true)
    const p = await db.product.findUniqueOrThrow({
      where: { slug: 'admin-phone-1' },
      include: { variants: { orderBy: { sort: 'asc' } } },
    })
    expect(p.variants).toHaveLength(2)
    expect(p.variants[1].images).toEqual(['/uploads/2026/10/a.webp'])
    expect(p.descriptionHtmlEn).toBe('<p>ok</p>')
    expect(await db.auditLog.count({ where: { entity: 'product', entityId: p.id } })).toBe(1)
    expect(revalidated).toContain('catalog')
  })

  test('one bad variant rejects the whole save and changes nothing', async () => {
    await signInAs('catalog')
    await saveProduct(
      {},
      productForm('admin-phone-2', [{ offerPrice: '50000', regularPrice: '55000' }]),
    )
    const p = await db.product.findUniqueOrThrow({
      where: { slug: 'admin-phone-2' },
      include: { variants: true },
    })
    const r = await saveProduct(
      {},
      productForm(
        'admin-phone-2',
        [
          { id: p.variants[0].id, offerPrice: '40000', regularPrice: '55000' },
          { offerPrice: '70000', regularPrice: '60000' },
        ],
        { id: p.id },
      ),
    )
    expect(r.ok).toBe(false)
    expect(r.fieldErrors?.['variants.1.offerPrice']).toBeTruthy()
    expect(
      (await db.variant.findUniqueOrThrow({ where: { id: p.variants[0].id } })).offerPrice,
    ).toBe(50000)
  })

  test('a removed variant is deleted; a sale needs a price below the offer and an end after the start', async () => {
    await signInAs('catalog')
    await saveProduct(
      {},
      productForm('admin-phone-3', [
        { offerPrice: '50000', regularPrice: '55000' },
        { offerPrice: '51000', regularPrice: '55000' },
      ]),
    )
    const p = await db.product.findUniqueOrThrow({
      where: { slug: 'admin-phone-3' },
      include: { variants: { orderBy: { sort: 'asc' } } },
    })
    await saveProduct(
      {},
      productForm(
        'admin-phone-3',
        [{ id: p.variants[0].id, offerPrice: '50000', regularPrice: '55000' }],
        { id: p.id },
      ),
    )
    expect(await db.variant.count({ where: { productId: p.id } })).toBe(1)

    const bad = await saveProduct(
      {},
      productForm(
        'admin-phone-3',
        [
          {
            id: p.variants[0].id,
            offerPrice: '50000',
            regularPrice: '55000',
            salePrice: '52000',
            saleStartsAt: '2026-10-12T10:00',
            saleEndsAt: '2026-10-11T10:00',
          },
        ],
        { id: p.id },
      ),
    )
    expect(bad.fieldErrors?.['variants.0.salePrice']).toBeTruthy()
    expect(bad.fieldErrors?.['variants.0.saleEndsAt']).toBeTruthy()

    const good = await saveProduct(
      {},
      productForm(
        'admin-phone-3',
        [
          {
            id: p.variants[0].id,
            offerPrice: '50000',
            regularPrice: '55000',
            salePrice: '45000',
            saleStartsAt: '2026-10-10T10:00',
            saleEndsAt: '2026-10-20T23:59',
          },
        ],
        { id: p.id },
      ),
    )
    expect(good.ok).toBe(true)
    const v = await db.variant.findUniqueOrThrow({ where: { id: p.variants[0].id } })
    expect(v.salePrice).toBe(45000)
    // Entered as Bangladesh time (UTC+6).
    expect(v.saleStartsAt?.toISOString()).toBe('2026-10-10T04:00:00.000Z')
  })

  test('a pre-order needs a booking amount no higher than the lowest price', async () => {
    await signInAs('catalog')
    const r = await saveProduct(
      {},
      productForm('admin-phone-4', [{ offerPrice: '5000', regularPrice: '5000' }], {
        preorder: 'on',
        bookingAmount: '',
      }),
    )
    expect(r.fieldErrors?.bookingAmount).toBeTruthy()
    const r2 = await saveProduct(
      {},
      productForm('admin-phone-4', [{ offerPrice: '5000', regularPrice: '5000' }], {
        preorder: 'on',
        bookingAmount: '6000',
      }),
    )
    expect(r2.fieldErrors?.bookingAmount).toBeTruthy()
  })
})

describe('bulk price and stock', () => {
  test('only changed rows are written, one audit row each', async () => {
    await signInAs('catalog')
    const vs = await db.variant.findMany({ take: 3, orderBy: { sku: 'asc' } })
    const fields: Record<string, string> = {}
    vs.forEach((v, i) => {
      fields[`rows.${i}.id`] = v.id
      fields[`rows.${i}.offerPrice`] = String(i === 1 ? v.offerPrice - 100 : v.offerPrice)
      fields[`rows.${i}.regularPrice`] = String(v.regularPrice)
      fields[`rows.${i}.stock`] = String(v.stock)
      fields[`rows.${i}.salePrice`] = v.salePrice?.toString() ?? ''
    })
    const before = await db.auditLog.count({ where: { entity: 'variant' } })
    expect((await bulkSaveVariants({}, form(fields))).ok).toBe(true)
    expect(await db.auditLog.count({ where: { entity: 'variant' } })).toBe(before + 1)
    expect((await db.variant.findUniqueOrThrow({ where: { id: vs[1].id } })).offerPrice).toBe(
      vs[1].offerPrice - 100,
    )
  })
})
