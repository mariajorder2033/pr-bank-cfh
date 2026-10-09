import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { db } from '@/lib/db'
import { seed } from '@/prisma/seed'

afterAll(() => db.$disconnect())

describe('seed', () => {
  let productsAfterFirstRun = 0

  beforeAll(async () => {
    await seed(db)
    productsAfterFirstRun = await db.product.count()
    await seed(db)
  })

  test('creates the sample catalog once, even when run twice', async () => {
    expect(productsAfterFirstRun).toBeGreaterThanOrEqual(24)
    expect(await db.product.count()).toBe(productsAfterFirstRun)
  })

  test('creates the seven staff roles, with every permission on owner', async () => {
    expect(await db.role.count()).toBe(7)
    const owner = await db.role.findUniqueOrThrow({
      where: { name: 'owner' },
      include: { permissions: true },
    })
    expect(owner.permissions.length).toBe(await db.permission.count())
  })

  test('seeds no EMI rates and no orders', async () => {
    expect(await db.emiRate.count()).toBe(0)
    expect(await db.order.count()).toBe(0)
  })

  test('every variant has whole-taka prices with offer <= regular', async () => {
    const variants = await db.variant.findMany()
    expect(variants.length).toBeGreaterThan(0)
    for (const v of variants) {
      expect(Number.isInteger(v.offerPrice) && Number.isInteger(v.regularPrice)).toBe(true)
      expect(v.offerPrice).toBeLessThanOrEqual(v.regularPrice)
    }
  })

  test('stores the measured motion defaults', async () => {
    const motion = await db.setting.findUniqueOrThrow({ where: { key: 'motion' } })
    expect((motion.value as { heroCycleMs: number }).heroCycleMs).toBe(4850)
  })
})
