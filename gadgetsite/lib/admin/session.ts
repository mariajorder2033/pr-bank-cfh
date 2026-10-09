import { newToken, sha256 } from '@/lib/auth/token'
import { db } from '@/lib/db'
import type { AdminUser } from '@/lib/generated/prisma/client'

// Admin sessions: an opaque cookie token; only its hash is stored. 12 h absolute lifetime.

export const ADMIN_COOKIE = 'gs_admin'
export const ADMIN_SESSION_TTL_MS = 12 * 3600_000

export type AdminSession = { user: AdminUser; permissions: Set<string>; roles: string[] }

export async function createAdminSession(
  userId: string,
  meta: { ip: string; userAgent?: string },
): Promise<string> {
  const token = newToken()
  await db.$transaction([
    db.adminUser.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), lastLoginIp: meta.ip },
    }),
    db.adminSession.create({
      data: {
        tokenHash: sha256(token),
        userId,
        expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 300),
      },
    }),
  ])
  return token
}

/**
 * The admin behind a session token, with their permissions. Null once the session expired,
 * the user was disabled, 2FA is not confirmed, or the password changed after sign-in.
 */
export async function readAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null
  const session = await db.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          roles: {
            include: { role: { include: { permissions: { include: { permission: true } } } } },
          },
        },
      },
    },
  })
  if (!session) return null
  const { user } = session
  const invalid =
    session.expiresAt.getTime() <= Date.now() ||
    !user.active ||
    !user.totpConfirmedAt ||
    user.passwordChangedAt > session.createdAt
  if (invalid) {
    await db.adminSession.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  const permissions = new Set(
    user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code)),
  )
  const { roles, ...plain } = user
  return { user: plain as AdminUser, permissions, roles: roles.map((r) => r.role.name) }
}

export async function revokeAdminSessions(userId: string): Promise<void> {
  await db.adminSession.deleteMany({ where: { userId } })
}

export async function endAdminSession(token: string | undefined): Promise<void> {
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: sha256(token) } })
}
