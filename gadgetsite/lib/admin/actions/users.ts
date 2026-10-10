import { z } from 'zod'
import { hashPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'
import { ActionError, adminAction } from '../action'
import { audited } from '../audit'
import { checkbox, requiredText } from '../forms'
import { revokeAdminSessions } from '../session'

export const ADMIN_PASSWORD_MIN = 12
const ids = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean))

/** Refuses a change that would leave the shop without an active owner (no lock-out). */
async function assertOwnerRemains(tx: Prisma.TransactionClient) {
  const owners = await tx.adminUser.count({
    where: { active: true, roles: { some: { role: { name: 'owner' } } } },
  })
  if (owners === 0) throw new ActionError('last_owner')
}

const snapshot = (tx: Prisma.TransactionClient, id: string) =>
  tx.adminUser.findUnique({
    where: { id },
    select: {
      email: true,
      active: true,
      totpConfirmedAt: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  })

export const inviteAdmin = adminAction(
  'users.manage',
  z.object({
    email: z.email().trim().toLowerCase().max(200),
    password: z.string().min(ADMIN_PASSWORD_MIN, 'password_short').max(200),
    roleIds: ids,
  }),
  [],
  async ({ email, password, roleIds }, { actorId, ip }) => {
    if (!roleIds.length) throw new ActionError('required', { roleIds: ['required'] })
    const passwordHash = await hashPassword(password)
    return audited<{ id: string }>(
      actorId,
      'create',
      'adminUser',
      (u) => u.id,
      async (tx) => {
        const user = await tx.adminUser.create({
          data: { email, passwordHash, roles: { create: roleIds.map((roleId) => ({ roleId })) } },
        })
        return { before: null, after: await snapshot(tx, user.id), result: { id: user.id } }
      },
      ip,
    )
  },
)

export const updateAdmin = adminAction(
  'users.manage',
  z.object({
    id: requiredText(40),
    roleIds: ids,
    active: checkbox,
    password: z
      .union([z.literal(''), z.string().min(ADMIN_PASSWORD_MIN, 'password_short').max(200)])
      .optional(),
  }),
  [],
  async ({ id, roleIds, active, password }, { actorId, ip }) => {
    const passwordHash = password ? await hashPassword(password) : undefined
    await audited(
      actorId,
      'update',
      'adminUser',
      id,
      async (tx) => {
        const before = await snapshot(tx, id)
        if (!before) throw new ActionError('not_found')
        await tx.userRole.deleteMany({ where: { userId: id } })
        if (roleIds.length)
          await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) })
        await tx.adminUser.update({
          where: { id },
          data: {
            active,
            ...(passwordHash ? { passwordHash, passwordChangedAt: new Date() } : {}),
          },
        })
        await assertOwnerRemains(tx)
        // Any change to someone's access ends their current sessions.
        await tx.adminSession.deleteMany({ where: { userId: id } })
        return { before, after: await snapshot(tx, id), result: null }
      },
      ip,
    )
  },
)

export const reset2fa = adminAction(
  'users.manage',
  z.object({ id: requiredText(40) }),
  [],
  async ({ id }, { actorId, ip }) => {
    await audited(
      actorId,
      'update',
      'adminUser',
      id,
      async (tx) => {
        const before = await snapshot(tx, id)
        if (!before) throw new ActionError('not_found')
        await tx.adminUser.update({
          where: { id },
          data: { totpSecretEncrypted: null, totpConfirmedAt: null },
        })
        return { before, after: await snapshot(tx, id), result: null }
      },
      ip,
    )
    await revokeAdminSessions(id)
  },
)

/** Role × permission matrix. The owner role always keeps every permission. */
export const saveRoleMatrix = adminAction(
  'users.manage',
  z.object({ grants: z.record(z.string(), ids).optional() }),
  [],
  async ({ grants = {} }, { actorId, ip }) => {
    const roles = await db.role.findMany({ include: { permissions: true } })
    for (const role of roles) {
      if (role.name === 'owner') continue
      const next = [...new Set(grants[role.id] ?? [])].sort()
      const prev = role.permissions.map((p) => p.permissionId).sort()
      if (JSON.stringify(next) === JSON.stringify(prev)) continue
      await audited(
        actorId,
        'update',
        'role',
        role.id,
        async (tx) => {
          await tx.rolePermission.deleteMany({ where: { roleId: role.id } })
          if (next.length)
            await tx.rolePermission.createMany({
              data: next.map((permissionId) => ({ roleId: role.id, permissionId })),
            })
          return {
            before: { role: role.name, permissions: prev },
            after: { role: role.name, permissions: next },
            result: null,
          }
        },
        ip,
      )
    }
  },
  (raw) => {
    // Every role must be present so that unticking all its boxes clears it.
    // Each role column posts a hidden `role.<id>`; the form parser nests those under `role`.
    const grants = (raw.grants ?? {}) as Record<string, unknown>
    for (const id of Object.keys((raw.role ?? {}) as object)) grants[id] ??= []
    return { grants }
  },
)
