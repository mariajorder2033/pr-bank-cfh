import { z } from 'zod'
import { db } from '@/lib/db'
import { ProductStatus } from '@/lib/generated/prisma/enums'
import { ActionError, adminAction } from '../action'
import { audited } from '../audit'
import {
  checkbox,
  intField,
  optionalDate,
  optionalInt,
  requiredText,
  slugField,
  text,
} from '../forms'
import { sanitizeRichText } from '../sanitize'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)

const images = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) =>
    (v === undefined ? [] : Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean),
  )
  .pipe(
    z
      .array(z.string().regex(/^(\/uploads\/[\w\-/.]+|\/ph\.svg|https:\/\/\S+)$/, 'invalid_value'))
      .max(12),
  )

const Variant = z
  .object({
    id: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),
    sku: requiredText(60),
    color: optionalText(40),
    storage: optionalText(40),
    ram: optionalText(40),
    region: optionalText(40),
    offerPrice: intField(0, 100_000_000),
    regularPrice: intField(0, 100_000_000),
    salePrice: optionalInt(0, 100_000_000),
    saleStartsAt: optionalDate,
    saleEndsAt: optionalDate,
    stock: intField(0, 1_000_000),
    images,
  })
  .superRefine((v, ctx) => {
    if (v.offerPrice > v.regularPrice)
      ctx.addIssue({ code: 'custom', path: ['offerPrice'], message: 'offer_above_regular' })
    if (v.salePrice !== undefined && v.salePrice >= v.offerPrice) {
      ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'sale_not_below_offer' })
    }
    if (v.saleStartsAt && v.saleEndsAt && v.saleEndsAt <= v.saleStartsAt) {
      ctx.addIssue({ code: 'custom', path: ['saleEndsAt'], message: 'end_before_start' })
    }
  })

const ids = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean))

const Product = z
  .object({
    id: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),
    slug: slugField,
    titleEn: requiredText(160),
    titleBn: text(160),
    brandId: requiredText(40),
    categoryId: requiredText(40),
    status: z.enum(ProductStatus),
    preorder: checkbox,
    bookingAmount: optionalInt(0, 100_000_000),
    lowStockThreshold: intField(0, 1000),
    warrantyEn: text(200),
    warrantyBn: text(200),
    descriptionHtmlEn: text(50_000),
    descriptionHtmlBn: text(50_000),
    badgeIds: ids,
    carePlanIds: ids,
    variants: z.array(Variant).min(1, 'required'),
  })
  .superRefine((p, ctx) => {
    const lowest = Math.min(...p.variants.map((v) => v.offerPrice))
    if (p.preorder && (p.bookingAmount === undefined || p.bookingAmount > lowest)) {
      ctx.addIssue({ code: 'custom', path: ['bookingAmount'], message: 'booking_invalid' })
    }
    const skus = p.variants.map((v) => v.sku)
    skus.forEach((s, i) => {
      if (skus.indexOf(s) !== i)
        ctx.addIssue({ code: 'custom', path: ['variants', i, 'sku'], message: 'taken' })
    })
  })

const productInclude = {
  variants: { orderBy: { sort: 'asc' as const } },
  badges: true,
  carePlans: true,
}

/** One save writes the product and its whole variant set, all-or-nothing, with one audit row. */
export const saveProduct = adminAction(
  'catalog.write',
  Product,
  ['catalog'],
  async (input, { actorId, ip }) => {
    const { id, variants, badgeIds, carePlanIds, ...fields } = input
    const data = {
      ...fields,
      bookingAmount: fields.preorder ? (fields.bookingAmount ?? null) : null,
      descriptionHtmlEn: sanitizeRichText(fields.descriptionHtmlEn),
      descriptionHtmlBn: sanitizeRichText(fields.descriptionHtmlBn),
    }
    return audited<{ id: string; slug: string }>(
      actorId,
      id ? 'update' : 'create',
      'product',
      (r) => r.id,
      async (tx) => {
        const before = id
          ? await tx.product.findUnique({ where: { id }, include: productInclude })
          : null
        if (id && !before) throw new ActionError('not_found')
        const product = id
          ? await tx.product.update({ where: { id }, data })
          : await tx.product.create({ data })

        const keep = new Set(variants.flatMap((v) => (v.id ? [v.id] : [])))
        const removed = (before?.variants ?? []).filter((v) => !keep.has(v.id))
        if (removed.length) {
          const ordered = await tx.orderItem.count({
            where: { variantId: { in: removed.map((v) => v.id) } },
          })
          if (ordered) throw new ActionError('variant_has_orders')
          await tx.variant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } })
        }
        for (const [sort, { id: variantId, ...v }] of variants.entries()) {
          const row = { ...v, salePrice: v.salePrice ?? null, sort }
          if (variantId && before?.variants.some((x) => x.id === variantId)) {
            await tx.variant.update({ where: { id: variantId }, data: row })
          } else {
            await tx.variant.create({ data: { ...row, productId: product.id } })
          }
        }
        await tx.productBadge.deleteMany({ where: { productId: product.id } })
        if (badgeIds.length)
          await tx.productBadge.createMany({
            data: badgeIds.map((badgeId) => ({ productId: product.id, badgeId })),
          })
        await tx.productCarePlan.deleteMany({ where: { productId: product.id } })
        if (carePlanIds.length) {
          await tx.productCarePlan.createMany({
            data: carePlanIds.map((carePlanId) => ({ productId: product.id, carePlanId })),
          })
        }
        const after = await tx.product.findUnique({
          where: { id: product.id },
          include: productInclude,
        })
        return { before, after, result: { id: product.id, slug: product.slug } }
      },
      ip,
    )
  },
)

const BulkRow = z.object({
  id: requiredText(40),
  offerPrice: intField(0, 100_000_000),
  regularPrice: intField(0, 100_000_000),
  salePrice: optionalInt(0, 100_000_000),
  stock: intField(0, 1_000_000),
})

/** Bulk price & stock: only rows that changed are written; one audit row per changed variant. */
export const bulkSaveVariants = adminAction(
  'catalog.write',
  z.object({ rows: z.array(BulkRow).max(2000) }),
  ['catalog'],
  async ({ rows }, { actorId, ip }) => {
    const current = new Map(
      (await db.variant.findMany({ where: { id: { in: rows.map((r) => r.id) } } })).map((v) => [
        v.id,
        v,
      ]),
    )
    const errors: Record<string, string[]> = {}
    rows.forEach((r, i) => {
      if (r.offerPrice > r.regularPrice) errors[`rows.${i}.offerPrice`] = ['offer_above_regular']
      if (r.salePrice !== undefined && r.salePrice >= r.offerPrice)
        errors[`rows.${i}.salePrice`] = ['sale_not_below_offer']
    })
    if (Object.keys(errors).length) throw new ActionError('invalid_value', errors)
    let changed = 0
    for (const r of rows) {
      const v = current.get(r.id)
      if (!v) continue
      const next = {
        offerPrice: r.offerPrice,
        regularPrice: r.regularPrice,
        salePrice: r.salePrice ?? null,
        stock: r.stock,
      }
      const prev = {
        offerPrice: v.offerPrice,
        regularPrice: v.regularPrice,
        salePrice: v.salePrice,
        stock: v.stock,
      }
      if (JSON.stringify(next) === JSON.stringify(prev)) continue
      await audited(
        actorId,
        'update',
        'variant',
        v.id,
        async (tx) => {
          await tx.variant.update({ where: { id: v.id }, data: next })
          return { before: prev, after: next, result: null }
        },
        ip,
      )
      changed++
    }
    return { changed }
  },
)
