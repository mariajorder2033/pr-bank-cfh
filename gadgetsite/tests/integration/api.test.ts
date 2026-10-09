import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }))

import { GET as getProducts } from '@/app/api/products/route'
import { POST as postPreorder } from '@/app/api/preorder-requests/route'
import { GET as getSearch } from '@/app/api/search/route'
import { db } from '@/lib/db'
import { seed } from '@/prisma/seed'

const APP = 'http://localhost:3000'

beforeAll(async () => {
  process.env.APP_URL = APP
  await seed(db)
})
afterAll(() => db.$disconnect())

const preorder = (body: unknown, origin: string | null = APP) =>
  postPreorder(
    new Request(`${APP}/api/preorder-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    }),
  )

describe('GET /api/products', () => {
  test('returns cards for the requested slugs', async () => {
    const res = await getProducts(new Request(`${APP}/api/products?slugs=pixel-9`))
    expect(res.status).toBe(200)
    expect((await res.json()).items[0].slug).toBe('pixel-9')
  })

  test('rejects more than 24 slugs', async () => {
    const slugs = Array.from({ length: 25 }, (_, i) => `s${i}`).join(',')
    const res = await getProducts(new Request(`${APP}/api/products?slugs=${slugs}`))
    expect(res.status).toBe(400)
  })
})

test('GET /api/search returns at most 8 matches', async () => {
  const res = await getSearch(new Request(`${APP}/api/search?q=galxy`))
  const { items } = await res.json()
  expect(items.map((p: { slug: string }) => p.slug)).toContain('galaxy-s25-ultra')
  expect(items.length).toBeLessThanOrEqual(8)
})

describe('POST /api/preorder-requests', () => {
  test('stores a valid request', async () => {
    const before = await db.preorderRequest.count()
    const res = await preorder({ name: 'Rafi', phone: '01712345678', productText: 'Pixel 10 Pro' })
    expect(res.status).toBe(201)
    expect(await db.preorderRequest.count()).toBe(before + 1)
  })

  test('rejects an invalid phone number', async () => {
    const res = await preorder({ phone: '12345', productText: 'Pixel 10 Pro' })
    expect(res.status).toBe(400)
  })

  test('rejects a request from another origin', async () => {
    const body = { phone: '01712345678', productText: 'Pixel 10 Pro' }
    expect((await preorder(body, null)).status).toBe(403)
    expect((await preorder(body, 'https://evil.example')).status).toBe(403)
  })
})
