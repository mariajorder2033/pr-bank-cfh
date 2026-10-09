import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined) }),
  headers: async () => new Headers({ 'x-forwarded-for': '8.8.8.8' }),
}))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`)
  },
}))
const revalidated: string[] = []
vi.mock('next/cache', () => ({
  revalidateTag: (t: string) => revalidated.push(t),
  unstable_cache: <T>(fn: T) => fn,
}))

import { z } from 'zod'
import { adminAction } from '@/lib/admin/action'
import { audited } from '@/lib/admin/audit'
import { Forbidden, requireAdmin } from '@/lib/admin/guard'
import { ADMIN_COOKIE, createAdminSession } from '@/lib/admin/session'
import { hashPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'
import { seed } from '@/prisma/seed'

async function adminWithRole(role: string) {
  const user = await db.adminUser.create({
    data: {
      email: `${role}-${Date.now()}-${Math.random()}@shop.test`,
      passwordHash: await hashPassword('x'.repeat(12)),
      totpConfirmedAt: new Date(),
      roles: { create: { role: { connect: { name: role } } } },
    },
  })
  jar.set(ADMIN_COOKIE, await createAdminSession(user.id, { ip: '8.8.8.8' }))
  return user
}

beforeAll(() => seed(db))
beforeEach(() => {
  jar.clear()
  revalidated.length = 0
})
afterAll(() => db.$disconnect())

describe('requireAdmin', () => {
  test('without a session it redirects to the login page', async () => {
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/admin/login')
  })

  test('a support user lacks catalog.write', async () => {
    await adminWithRole('support')
    await expect(requireAdmin('catalog.write')).rejects.toBeInstanceOf(Forbidden)
    await expect(requireAdmin('orders.read')).resolves.toBeTruthy()
  })
})

describe('audited', () => {
  test('writes one audit row with before and after', async () => {
    const user = await adminWithRole('owner')
    const badge = await audited<{ id: string }>(
      user.id,
      'create',
      'badge',
      (b) => b.id,
      async (tx) => {
        const b = await tx.badge.create({
          data: { code: `t-${Date.now()}`, labelEn: 'T', color: '#000' },
        })
        return { before: null, after: b, result: b }
      },
    )
    const rows = await db.auditLog.findMany({ where: { entity: 'badge', entityId: badge.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0].actorId).toBe(user.id)
  })

  test('a failure rolls back both the write and the audit row', async () => {
    const user = await adminWithRole('owner')
    const code = `rollback-${Date.now()}`
    await expect(
      audited(user.id, 'create', 'badge', code, async (tx) => {
        await tx.badge.create({ data: { code, labelEn: 'T', color: '#000' } })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await db.badge.count({ where: { code } })).toBe(0)
    expect(await db.auditLog.count({ where: { entityId: code } })).toBe(0)
  })

  test('a no-op update writes no audit row', async () => {
    const user = await adminWithRole('owner')
    const id = `noop-${Date.now()}`
    await audited(user.id, 'update', 'badge', id, async () => ({
      before: { a: 1 },
      after: { a: 1 },
      result: null,
    }))
    expect(await db.auditLog.count({ where: { entityId: id } })).toBe(0)
  })
})

describe('adminAction', () => {
  const action = adminAction(
    'catalog.write',
    z.object({
      code: z.string().min(2),
      label: z.object({ en: z.string().min(1), bn: z.string() }),
    }),
    ['catalog'],
    async (input) => ({ code: input.code, en: input.label.en }),
  )
  const form = (entries: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(entries)) f.set(k, v)
    return f
  }

  test('parses nested bilingual fields and revalidates the tags', async () => {
    await adminWithRole('owner')
    const r = await action({}, form({ code: 'ok', 'label.en': 'Hot', 'label.bn': 'হট' }))
    expect(r).toEqual({ ok: true, data: { code: 'ok', en: 'Hot' } })
    expect(revalidated).toEqual(['catalog'])
  })

  test('returns field errors and runs nothing on invalid input', async () => {
    await adminWithRole('owner')
    const r = await action({}, form({ code: 'x', 'label.en': '' }))
    expect(r.ok).toBe(false)
    expect(r.fieldErrors?.code).toBeTruthy()
    expect(revalidated).toEqual([])
  })

  test('refuses a user without the permission', async () => {
    await adminWithRole('support')
    expect(await action({}, form({ code: 'ok', 'label.en': 'Hot' }))).toEqual({
      ok: false,
      error: 'forbidden',
    })
  })
})
