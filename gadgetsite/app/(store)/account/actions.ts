'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  changePassword,
  loginOtp,
  loginPassword,
  logout,
  signUp,
} from '@/lib/auth/customer'
import { requestOtp } from '@/lib/auth/otp'
import { db } from '@/lib/db'
import { normalizePhone } from '@/lib/domain/phone'
import { requestMeta, safeNext } from '@/lib/server/request'
import { currentCustomer } from '@/lib/server/session'

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
  ok?: boolean
  phone?: string
  /** What the shopper typed, so a failed submit does not clear the form (never passwords). */
  values?: Record<string, string>
}

async function startSession(token: string) {
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Browsers accept Secure cookies on http://localhost, so this holds for local runs too.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

const field = (f: FormData, k: string) => String(f.get(k) ?? '')

export async function signUpAction(_: FormState, f: FormData): Promise<FormState> {
  const { ip, userAgent } = await requestMeta()
  const r = await signUp(
    { name: field(f, 'name'), phone: field(f, 'phone'), password: field(f, 'password') },
    ip,
    userAgent,
  )
  const values = { name: field(f, 'name'), phone: field(f, 'phone') }
  if ('fieldErrors' in r) return { fieldErrors: r.fieldErrors, values }
  if ('error' in r) return { error: r.error, values }
  await startSession(r.sessionToken)
  redirect(safeNext(f.get('next')))
}

export async function loginPasswordAction(_: FormState, f: FormData): Promise<FormState> {
  const { ip, userAgent } = await requestMeta()
  const r = await loginPassword(field(f, 'phone'), field(f, 'password'), ip, userAgent)
  if ('error' in r) return { error: r.error, values: { phone: field(f, 'phone') } }
  await startSession(r.sessionToken)
  redirect(safeNext(f.get('next')))
}

export async function requestCodeAction(_: FormState, f: FormData): Promise<FormState> {
  const phone = normalizePhone(field(f, 'phone'))
  const values = { phone: field(f, 'phone') }
  if (!phone) return { fieldErrors: { phone: ['phone'] }, values }
  const r = await requestOtp(phone, (await requestMeta()).ip)
  return 'error' in r ? { error: r.error, values } : { ok: true, phone }
}

export async function loginCodeAction(_: FormState, f: FormData): Promise<FormState> {
  const { ip, userAgent } = await requestMeta()
  const phone = field(f, 'phone')
  const r = await loginOtp(phone, field(f, 'code'), ip, userAgent)
  if ('error' in r) {
    return { ok: true, phone, error: r.error === 'invalid' ? 'codeInvalid' : r.error }
  }
  await startSession(r.sessionToken)
  redirect(safeNext(f.get('next')))
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies()
  await logout(jar.get(SESSION_COOKIE)?.value)
  jar.delete(SESSION_COOKIE)
  redirect('/')
}

const Profile = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.union([z.literal(''), z.email().max(200)]),
})

export async function saveProfileAction(_: FormState, f: FormData): Promise<FormState> {
  const customer = await currentCustomer()
  if (!customer) redirect('/account/login')
  const parsed = Profile.safeParse({ name: field(f, 'name'), email: field(f, 'email').trim() })
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: { name: field(f, 'name'), email: field(f, 'email') },
    }
  }
  await db.customer.update({
    where: { id: customer.id },
    data: { name: parsed.data.name, email: parsed.data.email || null },
  })
  // The header shows the name too, so refresh the whole layout.
  revalidatePath('/', 'layout')
  return { ok: true, values: { name: parsed.data.name, email: parsed.data.email } }
}

export async function changePasswordAction(_: FormState, f: FormData): Promise<FormState> {
  const customer = await currentCustomer()
  if (!customer) redirect('/account/login')
  const r = await changePassword(
    customer.id,
    field(f, 'current'),
    field(f, 'password'),
    await requestMeta(),
  )
  if ('fieldErrors' in r) return { fieldErrors: r.fieldErrors }
  if ('error' in r) return { error: 'wrongCurrent' }
  await startSession(r.sessionToken)
  return { ok: true }
}
