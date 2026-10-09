import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as { redis?: Redis }

/** The app's Redis client. Commands fail fast instead of queueing while disconnected. */
export function redis(): Redis {
  globalForRedis.redis ??= new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  })
  return globalForRedis.redis
}

/** The client, connected (commands fail fast while disconnected, so connect first). */
export async function connectedRedis(client: Redis = redis()): Promise<Redis> {
  if (client.status === 'wait' || client.status === 'end') await client.connect()
  return client
}
