import { afterAll, beforeAll, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest'

vi.mock('next/headers', () => import('../support/admin-mocks').then((m) => m.headersModule))
vi.mock('next/navigation', () => import('../support/admin-mocks').then((m) => m.navigationModule))
vi.mock('next/cache', () => import('../support/admin-mocks').then((m) => m.cacheModule))

import { inviteAdmin, reset2fa, saveRoleMatrix, updateAdmin } from '@/lib/admin/actions/users'
import { signOutCustomer } from '@/lib/admin/actions/customers'
import { createAdminSession, readAdminSession } from '@/lib/admin/session'
import { db } from '@/lib/db'
import { seed } from '@/prisma/seed'
import { form, jar, signInAs } from '../support/admin-mocks'

beforeAll(async () => {
  await seed(db)
})
beforeEach(async () => {
  jar.clear()
  // Every test starts with no other owners, so "the last owner" is well defined.
  await db.userRole.deleteMany({ where: { role: { name: 'owner' } } })
})
afterAll(() => db.$disconnect())

const roles = async (...names: string[]) =>
  (await db.role.findMany({ where: { name: { in: names } } })).map((r) => r.id)

describe('staff', () => {
  test('an owner invites a catalog manager', async () => {
    await signInAs('owner')
    const r = await inviteAdmin(
      {},
      form({
        email: 'New.Staff@Shop.BD',
        password: 'a-long-password',
        roleIds: await roles('catalog'),
      }),
    )
    expect(r.ok).toBe(true)
    const u = await db.adminUser.findUniqueOrThrow({
      where: { email: 'new.staff@shop.bd' },
      include: { roles: { include: { role: true } } },
    })
    expect(u.roles.map((x) => x.role.name)).toEqual(['catalog'])
  })

  test('the only owner cannot drop the owner role or be deactivated', async () => {
    const me = await signInAs('owner')
    const keepNoOwner = await updateAdmin(
      {},
      form({ id: me.id, roleIds: await roles('manager'), active: 'on' }),
    )
    expect(keepNoOwner).toMatchObject({ ok: false, error: 'last_owner' })
    const deactivate = await updateAdmin({}, form({ id: me.id, roleIds: await roles('owner') }))
    expect(deactivate).toMatchObject({ ok: false, error: 'last_owner' })
  })

  test('with two owners one can step down, and their sessions end', async () => {
    await signInAs('owner')
    const other = await db.adminUser.create({
      data: {
        email: `o2-${Date.now()}@shop.test`,
        passwordHash: 'x',
        totpConfirmedAt: new Date(),
        roles: { create: { role: { connect: { name: 'owner' } } } },
      },
    })
    const token = await createAdminSession(other.id, { ip: '1.1.1.1' })
    expect(
      (await updateAdmin({}, form({ id: other.id, roleIds: await roles('support'), active: 'on' })))
        .ok,
    ).toBe(true)
    expect(await readAdminSession(token)).toBeNull()
  })

  test('resetting 2FA signs the admin out and asks for enrolment again', async () => {
    await signInAs('owner')
    const other = await db.adminUser.create({
      data: {
        email: `s-${Date.now()}@shop.test`,
        passwordHash: 'x',
        totpConfirmedAt: new Date(),
        roles: { create: { role: { connect: { name: 'support' } } } },
      },
    })
    const token = await createAdminSession(other.id, { ip: '1.1.1.1' })
    expect((await reset2fa({}, form({ id: other.id }))).ok).toBe(true)
    expect(
      (await db.adminUser.findUniqueOrThrow({ where: { id: other.id } })).totpConfirmedAt,
    ).toBeNull()
    expect(await readAdminSession(token)).toBeNull()
  })

  test('a catalog user cannot manage staff', async () => {
    await signInAs('catalog')
    expect(
      await inviteAdmin(
        {},
        form({ email: 'x@shop.bd', password: 'a-long-password', roleIds: await roles('owner') }),
      ),
    ).toEqual({ ok: false, error: 'forbidden' })
  })
})

describe('roles', () => {
  test('the role matrix saves, is audited, and never changes the owner role', async () => {
    await signInAs('owner')
    const support = (await db.role.findUniqueOrThrow({ where: { name: 'support' } })).id
    const owner = (await db.role.findUniqueOrThrow({ where: { name: 'owner' } })).id
    const perm = await db.permission.findUniqueOrThrow({ where: { code: 'catalog.write' } })
    const before = await db.rolePermission.count({ where: { roleId: owner } })
    const supportBefore = await db.rolePermission.findMany({ where: { roleId: support } })
    onTestFinished(async () => {
      // Other suites rely on the seeded support role.
      await db.rolePermission.deleteMany({ where: { roleId: support } })
      await db.rolePermission.createMany({ data: supportBefore })
    })
    const r = await saveRoleMatrix(
      {},
      form({ [`grants.${support}`]: [perm.id], [`grants.${owner}`]: [] }),
    )
    expect(r.ok).toBe(true)
    expect(await db.rolePermission.findMany({ where: { roleId: support } })).toEqual([
      expect.objectContaining({ permissionId: perm.id }),
    ])
    expect(await db.rolePermission.count({ where: { roleId: owner } })).toBe(before)
    expect(
      await db.auditLog.count({ where: { entity: 'role', entityId: support } }),
    ).toBeGreaterThan(0)
  })
})

test('unticking every box clears a role', async () => {
  await signInAs('owner')
  const support = (await db.role.findUniqueOrThrow({ where: { name: 'support' } })).id
  const supportBefore = await db.rolePermission.findMany({ where: { roleId: support } })
  onTestFinished(async () => {
    await db.rolePermission.deleteMany({ where: { roleId: support } })
    await db.rolePermission.createMany({ data: supportBefore })
  })
  expect(supportBefore.length).toBeGreaterThan(0)
  expect((await saveRoleMatrix({}, form({ [`role.${support}`]: '1' }))).ok).toBe(true)
  expect(await db.rolePermission.count({ where: { roleId: support } })).toBe(0)
})

describe('customers', () => {
  test('signing a customer out everywhere ends all their sessions', async () => {
    await signInAs('owner')
    const c = await db.customer.create({ data: { phone: `017${String(Date.now()).slice(-8)}` } })
    await db.customerSession.create({
      data: {
        tokenHash: `h-${Date.now()}`,
        customerId: c.id,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })
    expect((await signOutCustomer({}, form({ id: c.id }))).ok).toBe(true)
    expect(await db.customerSession.count({ where: { customerId: c.id } })).toBe(0)
  })
})
