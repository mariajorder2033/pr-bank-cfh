import { headers } from 'next/headers'

/** Client IP and user agent for rate limits and login records (first X-Forwarded-For hop). */
export async function requestMeta(): Promise<{ ip: string; userAgent?: string }> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = (forwarded || h.get('x-real-ip') || '127.0.0.1').slice(0, 64)
  return { ip, userAgent: h.get('user-agent') ?? undefined }
}

/** A same-site path to return to after login; anything else falls back to /account. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(next) ? next : '/account'
}
