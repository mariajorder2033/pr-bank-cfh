import { randomUUID } from 'node:crypto'
import { expect, test } from 'vitest'
import { RateLimitUnavailable, hit } from '@/lib/server/rate-limit'

test('allows up to the limit, then refuses with a retry time', async () => {
  const key = `test:${randomUUID()}`
  for (let i = 0; i < 3; i++) expect((await hit(key, 3, 60)).allowed).toBe(true)
  const fourth = await hit(key, 3, 60)
  expect(fourth.allowed).toBe(false)
  expect(fourth.retryAfterS).toBeGreaterThan(0)
  expect((await hit(`test:${randomUUID()}`, 3, 60)).allowed).toBe(true)
})

test('fails closed when Redis is unreachable', async () => {
  const { Redis } = await import('ioredis')
  const dead = new Redis('redis://127.0.0.1:1', {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  })
  await expect(hit('test:dead', 3, 60, dead)).rejects.toBeInstanceOf(RateLimitUnavailable)
  dead.disconnect()
})
