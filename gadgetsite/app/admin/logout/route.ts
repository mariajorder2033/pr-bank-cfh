import { cookies } from 'next/headers'
import { ADMIN_COOKIE, endAdminSession } from '@/lib/admin/session'
import { isSameOrigin } from '@/lib/server/http'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new Response('Forbidden', { status: 403 })
  const jar = await cookies()
  await endAdminSession(jar.get(ADMIN_COOKIE)?.value)
  jar.delete(ADMIN_COOKIE)
  return Response.redirect(new URL('/admin/login', req.url), 303)
}
