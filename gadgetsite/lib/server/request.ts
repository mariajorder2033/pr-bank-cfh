import { headers } from 'next/headers'

/**
 * The client's IP from X-Forwarded-For. Clients can send their own X-Forwarded-For, so only
 * the hops added by our own proxies are trusted: with `hops` proxies in front, the client is
 * the hop-th entry from the right. Without a proxy, Next.js sets the header to the socket
 * address only when the client sent none, so production must run behind a proxy that
 * appends (nginx `$proxy_add_x_forwarded_for`, Cloud Run, a load balancer).
 */
export function clientIp(forwarded: string | null, hops: number): string {
  const parts = (forwarded ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  return (parts[parts.length - hops] ?? '0.0.0.0').slice(0, 64)
}

const trustedHops = () => Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1)

/** Client IP and user agent for rate limits and login records. */
export async function requestMeta(): Promise<{ ip: string; userAgent?: string }> {
  const h = await headers()
  return {
    ip: clientIp(h.get('x-forwarded-for'), trustedHops()),
    userAgent: h.get('user-agent')?.slice(0, 300) ?? undefined,
  }
}

/** A same-site path to return to after login; anything else falls back to /account. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(next) && !/\/\/|\/\./.test(next)
    ? next
    : '/account'
}
