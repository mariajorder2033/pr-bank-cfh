import { afterAll, beforeAll, expect, test, vi } from 'vitest'

// Records every (function, arguments) pair that would become a data-cache entry.
const keys = new Set<string>()
vi.mock('next/cache', () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>, parts: string[]) =>
    (...args: A) => {
      keys.add(JSON.stringify([parts, args]))
      return fn(...args)
    },
}))

import { db } from '@/lib/db'
import * as cached from '@/lib/server/cached'
import { seed } from '@/prisma/seed'

beforeAll(() => seed(db))
afterAll(() => db.$disconnect())

test('anonymous input never becomes a data-cache key', async () => {
  for (let i = 0; i < 5; i++) {
    await cached.listProducts({ category: 'phones', min: 1000 + i, page: 1 + i })
    await cached.searchProducts(`probe-${i}`)
    await cached.getProductsBySlugs([`probe-${i}`, 'pixel-9'])
    await cached.getProduct(`probe-${i}`)
    await cached.getCategory(`probe-${i}`)
    await cached.getPage(`probe-${i}`)
  }
  const all = [...keys].join('\n')
  expect(all).not.toContain('probe-')
  expect(all).not.toContain('1003')
  expect(keys.size).toBeLessThanOrEqual(10)
})

test('known slugs are still served through the cache', async () => {
  expect((await cached.getProduct('pixel-9'))?.slug).toBe('pixel-9')
  expect((await cached.getCategory('phones'))?.slug).toBe('phones')
  expect((await cached.listProducts({ category: 'phones' })).total).toBeGreaterThan(0)
})
