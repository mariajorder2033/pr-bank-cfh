// Shared stand-ins for Next.js request APIs in admin integration tests.
// In a test file:  vi.mock('next/headers', () => import('../support/admin-mocks').then((m) => m.headersModule))
import { createAdminSession } from '@/lib/admin/session'
import { hashPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'

export const jar = new Map<string, string>()
export const revalidated: string[] = []

export const headersModule = {
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined) }),
  headers: async () => new Headers({ 'x-forwarded-for': '8.8.8.8' }),
}
export const navigationModule = {
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`)
  },
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}
export const cacheModule = {
  revalidateTag: (t: string) => revalidated.push(t),
  revalidatePath: () => {},
  unstable_cache: <T>(fn: T) => fn,
}

/** Creates an admin with confirmed 2FA and the given role, and signs them in. */
export async function signInAs(role: string) {
  const user = await db.adminUser.create({
    data: {
      email: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@shop.test`,
      passwordHash: await hashPassword('x'.repeat(12)),
      totpConfirmedAt: new Date(),
      roles: { create: { role: { connect: { name: role } } } },
    },
  })
  jar.set('gs_admin', await createAdminSession(user.id, { ip: '8.8.8.8' }))
  return user
}

export function form(entries: Record<string, string | string[]>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) {
    for (const item of Array.isArray(v) ? v : [v]) f.append(k, item)
  }
  return f
}
