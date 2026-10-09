import { z } from 'zod'
import type { Prisma } from '@/lib/generated/prisma/client'
import { ActionError, adminAction } from '../action'
import { audited } from '../audit'
import { checkbox, imageUrl, intField, requiredText, slugField, text } from '../forms'

type Tx = Prisma.TransactionClient
type Delegate = {
  findUnique(args: { where: { id: string } }): Promise<unknown>
  create(args: { data: object }): Promise<{ id: string }>
  update(args: { where: { id: string }; data: object }): Promise<{ id: string }>
  delete(args: { where: { id: string } }): Promise<unknown>
}

const id = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)

/** Create when there is no id, update otherwise — both audited in one transaction. */
function upsert(entity: string, pick: (tx: Tx) => Delegate) {
  return (actorId: string, ip: string, rowId: string | undefined, data: object) =>
    audited<{ id: string }>(
      actorId,
      rowId ? 'update' : 'create',
      entity,
      (r) => r.id,
      async (tx) => {
        const model = pick(tx)
        const before = rowId ? await model.findUnique({ where: { id: rowId } }) : null
        if (rowId && !before) throw new ActionError('not_found')
        const row = rowId
          ? await model.update({ where: { id: rowId }, data })
          : await model.create({ data })
        return { before, after: row, result: row }
      },
      ip,
    )
}

function remove(
  entity: string,
  pick: (tx: Tx) => Delegate,
  guard?: (tx: Tx, id: string) => Promise<void>,
) {
  return (actorId: string, ip: string, rowId: string) =>
    audited(
      actorId,
      'delete',
      entity,
      rowId,
      async (tx) => {
        await guard?.(tx, rowId)
        const model = pick(tx)
        const before = await model.findUnique({ where: { id: rowId } })
        if (!before) throw new ActionError('not_found')
        await model.delete({ where: { id: rowId } })
        return { before, after: null, result: null }
      },
      ip,
    )
}

// ─── Categories ──────────────────────────────────────────────────────────────

const Category = z.object({
  id,
  slug: slugField,
  nameEn: requiredText(80),
  nameBn: text(80),
  parentId: z
    .string()
    .trim()
    .transform((v) => v || null),
  sort: intField(0, 10_000),
  active: checkbox,
})

/** True when `parentId` is `id` itself or one of its descendants. */
async function wouldCycle(tx: Tx, id: string, parentId: string): Promise<boolean> {
  let cursor: string | null = parentId
  for (let depth = 0; cursor && depth < 50; depth++) {
    if (cursor === id) return true
    cursor =
      (await tx.category.findUnique({ where: { id: cursor }, select: { parentId: true } }))
        ?.parentId ?? null
  }
  return false
}

const upsertCategory = upsert('category', (tx) => tx.category as unknown as Delegate)

export const saveCategory = adminAction(
  'catalog.write',
  Category,
  ['catalog', 'content'],
  async (v, { actorId, ip }) => {
    const { id: rowId, ...data } = v
    if (rowId && data.parentId) {
      const { db } = await import('@/lib/db')
      if (await wouldCycle(db as unknown as Tx, rowId, data.parentId)) {
        throw new ActionError('cycle', { parentId: ['cycle'] })
      }
    }
    return upsertCategory(actorId, ip, rowId, data)
  },
)

const inUse = (what: 'categoryId' | 'brandId') => async (tx: Tx, rowId: string) => {
  const count = await tx.product.count({ where: { [what]: rowId } })
  if (count) throw new ActionError('in_use')
}

export const deleteCategory = adminAction(
  'catalog.write',
  z.object({ id: z.string().min(1) }),
  ['catalog', 'content'],
  async ({ id: rowId }, { actorId, ip }) => {
    const { db } = await import('@/lib/db')
    if (await db.category.count({ where: { parentId: rowId } })) throw new ActionError('in_use')
    return remove('category', (tx) => tx.category as unknown as Delegate, inUse('categoryId'))(
      actorId,
      ip,
      rowId,
    )
  },
)

// ─── Brands ──────────────────────────────────────────────────────────────────

const Brand = z.object({
  id,
  slug: slugField,
  nameEn: requiredText(80),
  nameBn: text(80),
  logoUrl: imageUrl,
  sort: intField(0, 10_000),
  active: checkbox,
})

const upsertBrand = upsert('brand', (tx) => tx.brand as unknown as Delegate)
export const saveBrand = adminAction(
  'catalog.write',
  Brand,
  ['catalog', 'content'],
  async (v, { actorId, ip }) => {
    const { id: rowId, ...data } = v
    return upsertBrand(actorId, ip, rowId, data)
  },
)
export const deleteBrand = adminAction(
  'catalog.write',
  z.object({ id: z.string().min(1) }),
  ['catalog', 'content'],
  async ({ id: rowId }, { actorId, ip }) =>
    remove('brand', (tx) => tx.brand as unknown as Delegate, inUse('brandId'))(actorId, ip, rowId),
)

// ─── Badges ──────────────────────────────────────────────────────────────────

const Badge = z.object({
  id,
  code: slugField,
  labelEn: requiredText(40),
  labelBn: text(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{3,8}$/, 'invalid_value'),
})
const upsertBadge = upsert('badge', (tx) => tx.badge as unknown as Delegate)
export const saveBadge = adminAction(
  'catalog.write',
  Badge,
  ['catalog'],
  async (v, { actorId, ip }) => {
    const { id: rowId, ...data } = v
    return upsertBadge(actorId, ip, rowId, data)
  },
)
export const deleteBadge = adminAction(
  'catalog.write',
  z.object({ id: z.string().min(1) }),
  ['catalog'],
  async ({ id: rowId }, { actorId, ip }) =>
    remove('badge', (tx) => tx.badge as unknown as Delegate)(actorId, ip, rowId),
)

// ─── Care plans ──────────────────────────────────────────────────────────────

const CarePlan = z.object({
  id,
  nameEn: requiredText(80),
  nameBn: text(80),
  price: intField(0, 10_000_000),
  coverageMonths: intField(1, 60),
  descriptionEn: text(1000),
  descriptionBn: text(1000),
})
const upsertCarePlan = upsert('carePlan', (tx) => tx.carePlan as unknown as Delegate)
export const saveCarePlan = adminAction(
  'catalog.write',
  CarePlan,
  ['catalog'],
  async (v, { actorId, ip }) => {
    const { id: rowId, ...data } = v
    return upsertCarePlan(actorId, ip, rowId, data)
  },
)
export const deleteCarePlan = adminAction(
  'catalog.write',
  z.object({ id: z.string().min(1) }),
  ['catalog'],
  async ({ id: rowId }, { actorId, ip }) =>
    remove('carePlan', (tx) => tx.carePlan as unknown as Delegate)(actorId, ip, rowId),
)
