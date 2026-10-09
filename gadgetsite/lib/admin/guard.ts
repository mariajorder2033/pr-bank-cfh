import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { permissions } from '@/prisma/seed-data/defaults'
import { ADMIN_COOKIE, readAdminSession, type AdminSession } from './session'

export type PermissionCode = (typeof permissions)[number]

export class Forbidden extends Error {
  constructor(readonly permission: string) {
    super(`Missing permission ${permission}`)
    this.name = 'Forbidden'
  }
}

/** The signed-in admin for this request, or null. */
export async function currentAdmin(): Promise<AdminSession | null> {
  return readAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)
}

/** Every admin page and action starts here: no session → login; no permission → Forbidden. */
export async function requireAdmin(permission?: PermissionCode): Promise<AdminSession> {
  const admin = await currentAdmin()
  if (!admin) redirect('/admin/login')
  if (permission && !admin.permissions.has(permission)) throw new Forbidden(permission)
  return admin
}

/** For pages: like requireAdmin, but shows the "not allowed" page instead of throwing. */
export async function requirePage(permission?: PermissionCode): Promise<AdminSession> {
  try {
    return await requireAdmin(permission)
  } catch (e) {
    if (e instanceof Forbidden) redirect('/admin/forbidden')
    throw e
  }
}
