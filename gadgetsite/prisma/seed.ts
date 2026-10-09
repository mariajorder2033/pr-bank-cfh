import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { PrismaClient } from '../lib/generated/prisma/client'
import { badges, brands, categories, products } from './seed-data/catalog'
import {
  couriers,
  layouts,
  pages,
  paymentProviders,
  permissions,
  roles,
  settings,
} from './seed-data/defaults'

/**
 * Idempotent seed: every row is an upsert with an empty update, so re-running never
 * duplicates rows or overwrites what staff changed in admin.
 */
export async function seed(db: PrismaClient): Promise<void> {
  for (const code of permissions) {
    await db.permission.upsert({ where: { code }, update: {}, create: { code } })
  }
  for (const [name, codes] of Object.entries(roles)) {
    const role = await db.role.upsert({ where: { name }, update: {}, create: { name } })
    for (const code of codes) {
      const permission = await db.permission.findUniqueOrThrow({ where: { code } })
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value: value as object } })
  }
  for (const p of paymentProviders) {
    await db.paymentProvider.upsert({ where: { id: p.id }, update: {}, create: p })
  }
  for (const c of couriers) {
    await db.courier.upsert({ where: { id: c.id }, update: {}, create: c })
  }
  for (const page of pages) {
    await db.page.upsert({ where: { slug: page.slug }, update: {}, create: page })
  }

  const categoryIds = new Map<string, string>()
  for (const [sort, c] of categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sort },
    })
    categoryIds.set(c.slug, row.id)
  }
  const brandIds = new Map<string, string>()
  for (const [sort, b] of brands.entries()) {
    const row = await db.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: { ...b, sort },
    })
    brandIds.set(b.slug, row.id)
  }
  const badgeIds = new Map<string, string>()
  for (const b of badges) {
    const row = await db.badge.upsert({ where: { code: b.code }, update: {}, create: b })
    badgeIds.set(b.code, row.id)
  }

  for (const p of products) {
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        titleEn: p.titleEn,
        categoryId: categoryIds.get(p.category)!,
        brandId: brandIds.get(p.brand)!,
        descriptionHtmlEn: `<p>${p.specs}</p>`,
        status: 'active',
        preorder: p.preorder ?? false,
        bookingAmount: p.bookingAmount,
        warrantyEn: p.warrantyEn,
      },
    })
    for (const [sort, v] of p.variants.entries()) {
      const sku = `${p.slug}-${sort + 1}`.toUpperCase()
      await db.variant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          sku,
          color: v.color,
          storage: v.storage,
          ram: v.ram,
          region: v.region,
          offerPrice: v.offer,
          regularPrice: v.regular,
          stock: v.stock,
          images: ['/ph.svg'],
          sort,
        },
      })
    }
    for (const code of p.badges ?? []) {
      const badgeId = badgeIds.get(code)!
      await db.productBadge.upsert({
        where: { productId_badgeId: { productId: product.id, badgeId } },
        update: {},
        create: { productId: product.id, badgeId },
      })
    }
  }

  for (const [page, sections] of Object.entries(layouts)) {
    await db.layout.upsert({
      where: { page },
      update: {},
      create: { page, sections: sections as object[] },
    })
  }

  // Mega menus and EXPLORE ALL: per category, the brands that have products in it.
  for (const c of categories) {
    const categoryId = categoryIds.get(c.slug)!
    const brandSlugs = [
      ...new Set(products.filter((p) => p.category === c.slug).map((p) => p.brand)),
    ]
    const items = brandSlugs.map((slug) => {
      const b = brands.find((x) => x.slug === slug)!
      return { label: { en: b.nameEn, bn: b.nameBn }, href: `/category/${c.slug}?brands=${slug}` }
    })
    const existing = await db.megaMenu.findFirst({ where: { categoryId } })
    if (!existing) {
      await db.megaMenu.create({ data: { categoryId, layout: 'cols2', rowsPerCol: 7, items } })
    }
    for (const [sort, slug] of brandSlugs.entries()) {
      const brandId = brandIds.get(slug)!
      await db.exploreBrand.upsert({
        where: { categoryId_brandId: { categoryId, brandId } },
        update: {},
        create: { categoryId, brandId, sort },
      })
    }
  }

  await db.menu.upsert({
    where: { location: 'footer' },
    update: {},
    create: {
      location: 'footer',
      items: pages.map((p) => ({ label: { en: p.titleEn, bn: p.titleBn }, href: `/${p.slug}` })),
    },
  })

  await db.menu.upsert({
    where: { location: 'header' },
    update: {},
    create: {
      location: 'header',
      items: categories.map((c) => ({
        label: { en: c.nameEn, bn: c.nameBn },
        href: `/category/${c.slug}`,
      })),
    },
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const { db } = await import('../lib/db')
  await seed(db)
  const [productCount, variantCount] = await Promise.all([db.product.count(), db.variant.count()])
  console.log(`Seeded: ${productCount} products, ${variantCount} variants`)
  await db.$disconnect()
}
