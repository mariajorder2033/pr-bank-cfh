import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('next/headers', () => import('../support/admin-mocks').then((m) => m.headersModule))
vi.mock('next/navigation', () => import('../support/admin-mocks').then((m) => m.navigationModule))
vi.mock('next/cache', () => import('../support/admin-mocks').then((m) => m.cacheModule))

import {
  deleteBrand,
  deleteCategory,
  saveBadge,
  saveBrand,
  saveCarePlan,
  saveCategory,
} from '@/lib/admin/actions/catalog-meta'
import { db } from '@/lib/db'
import { seed } from '@/prisma/seed'
import { form, jar, revalidated, signInAs } from '../support/admin-mocks'

beforeAll(() => seed(db))
beforeEach(() => {
  jar.clear()
  revalidated.length = 0
})
afterAll(() => db.$disconnect())

const cat = (slug: string, extra: Record<string, string> = {}) =>
  form({ slug, nameEn: slug, nameBn: '', parentId: '', sort: '0', active: 'on', ...extra })

describe('categories', () => {
  test('create, then a duplicate slug is a field error', async () => {
    await signInAs('catalog')
    expect((await saveCategory({}, cat('drones'))).ok).toBe(true)
    expect((await saveCategory({}, cat('drones'))).fieldErrors?.slug).toEqual(['taken'])
    expect(revalidated).toEqual(expect.arrayContaining(['catalog', 'content']))
  })

  test('a category with products cannot be deleted', async () => {
    await signInAs('catalog')
    const phones = await db.category.findUniqueOrThrow({ where: { slug: 'phones' } })
    expect(await deleteCategory({}, form({ id: phones.id }))).toMatchObject({
      ok: false,
      error: 'in_use',
    })
    expect(await db.category.count({ where: { id: phones.id } })).toBe(1)
  })

  test('a category cannot be moved inside its own descendant', async () => {
    await signInAs('catalog')
    await saveCategory({}, cat('gadgets'))
    const gadgets = await db.category.findUniqueOrThrow({ where: { slug: 'gadgets' } })
    await saveCategory({}, cat('gimbals', { parentId: gadgets.id }))
    const gimbals = await db.category.findUniqueOrThrow({ where: { slug: 'gimbals' } })
    const r = await saveCategory({}, cat('gadgets', { id: gadgets.id, parentId: gimbals.id }))
    expect(r.fieldErrors?.parentId).toEqual(['cycle'])
  })
})

describe('brands, badges and care plans', () => {
  test('brand create, update and delete each leave an audit row', async () => {
    await signInAs('catalog')
    await saveBrand(
      {},
      form({
        slug: 'nothing',
        nameEn: 'Nothing',
        nameBn: '',
        logoUrl: '',
        sort: '0',
        active: 'on',
      }),
    )
    const b = await db.brand.findUniqueOrThrow({ where: { slug: 'nothing' } })
    await saveBrand(
      {},
      form({
        id: b.id,
        slug: 'nothing',
        nameEn: 'Nothing Tech',
        nameBn: '',
        logoUrl: '',
        sort: '1',
        active: 'on',
      }),
    )
    expect((await deleteBrand({}, form({ id: b.id }))).ok).toBe(true)
    const actions = (
      await db.auditLog.findMany({ where: { entity: 'brand', entityId: b.id } })
    ).map((a) => a.action)
    expect(actions.sort()).toEqual(['create', 'delete', 'update'])
  })

  test('a badge colour must be hex; a care plan needs 1–60 months', async () => {
    await signInAs('catalog')
    expect(
      (await saveBadge({}, form({ code: 'sale', labelEn: 'Sale', labelBn: '', color: 'red' })))
        .fieldErrors?.color,
    ).toBeTruthy()
    const r = await saveCarePlan(
      {},
      form({
        nameEn: 'Care+',
        nameBn: '',
        price: '1999',
        coverageMonths: '0',
        descriptionEn: '',
        descriptionBn: '',
      }),
    )
    expect(r.fieldErrors?.coverageMonths).toBeTruthy()
  })

  test('a support user cannot edit the catalog', async () => {
    await signInAs('support')
    expect(
      await saveBrand(
        {},
        form({ slug: 'x-brand', nameEn: 'X', nameBn: '', logoUrl: '', sort: '0' }),
      ),
    ).toEqual({ ok: false, error: 'forbidden' })
  })
})
