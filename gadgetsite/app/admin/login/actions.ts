'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { finishLogin, startLogin } from '@/lib/admin/auth'
import { ADMIN_COOKIE, ADMIN_SESSION_TTL_MS } from '@/lib/admin/session'
import { requestMeta } from '@/lib/server/request'

export type LoginState = {
  step?: 'totp' | 'enrol'
  pendingToken?: string
  enrol?: { secret: string; qr: string }
  email?: string
  error?: string
}

export async function passwordStep(_: LoginState, f: FormData): Promise<LoginState> {
  const email = String(f.get('email') ?? '')
  const r = await startLogin(email, String(f.get('password') ?? ''), (await requestMeta()).ip)
  if ('error' in r) return { error: r.error, email }
  return { step: r.step, pendingToken: r.pendingToken, enrol: r.enrol, email }
}

export async function codeStep(prev: LoginState, f: FormData): Promise<LoginState> {
  const { ip, userAgent } = await requestMeta()
  const r = await finishLogin(
    String(f.get('pendingToken') ?? ''),
    String(f.get('code') ?? ''),
    ip,
    {
      userAgent,
    },
  )
  if ('error' in r)
    return r.error === 'expired' ? { error: 'expired' } : { ...prev, error: r.error }
  ;(await cookies()).set(ADMIN_COOKIE, r.sessionToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: ADMIN_SESSION_TTL_MS / 1000,
  })
  redirect('/admin')
}
