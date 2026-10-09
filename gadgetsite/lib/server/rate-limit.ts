import type { Redis } from 'ioredis'
import { redis } from '@/lib/redis'

/** Thrown when the limiter cannot reach Redis: callers refuse the request (fail closed). */
export class RateLimitUnavailable extends Error {
  constructor(cause: unknown) {
    super('Rate limiter unavailable', { cause })
    this.name = 'RateLimitUnavailable'
  }
}

/** Fixed-window counter: at most `limit` hits per `windowS` seconds for `key`. */
export async function hit(
  key: string,
  limit: number,
  windowS: number,
  client: Redis = redis(),
): Promise<{ allowed: boolean; retryAfterS: number }> {
  try {
    if (client.status === 'wait') await client.connect()
    const [[, count], [, ttl]] = (await client
      .multi()
      .incr(`rl:${key}`)
      .ttl(`rl:${key}`)
      .exec()) as [[null, number], [null, number]]
    if (ttl < 0) await client.expire(`rl:${key}`, windowS)
    return { allowed: count <= limit, retryAfterS: ttl > 0 ? ttl : windowS }
  } catch (e) {
    throw new RateLimitUnavailable(e)
  }
}
