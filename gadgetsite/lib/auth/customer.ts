import { z } from 'zod'
import { db } from '@/lib/db'
import { normalizePhone } from '@/lib/domain/phone'
import type { Customer } from '@/lib/generated/prisma/client'
import { RateLimitUnavailable, hit } from '@/lib/server/rate-limit'
import { verifyOtp } from './otp'
import { DUMMY_HASH, hashPassword, verifyPassword } from './password'
import { newToken, sha256 } from './token'

// Customer accounts (spec §9): phone + password, or phone + SMS code (§6.2).

export const SESSION_COOKIE = 'gs_customer'
export const SESSION_TTL_MS = 30 * 24 * 3600_000
export const PASSWORD_MIN = 8

type Limited = { error: 'rate_limited' | 'unavailable' }
type Session = { sessionToken: string }
type Meta = { ip: string; userAgent?: string }

async function limit(checks: [string, number, number][]): Promise<Limited | null> {
  try {
    for (const [key, max, windowS] of checks) {
      if (!(await hit(key, max, windowS)).allowed) return { error: 'rate_limited' }
    }
    return null
  } catch (e) {
    if (e instanceof RateLimitUnavailable) return { error: 'unavailable' }
    throw e
  }
}

async function createSession(customerId: string, meta: Meta): Promise<string> {
  const token = newToken()
  await db.customerSession.create({
    data: {
      tokenHash: sha256(token),
      customerId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300),
    },
  })
  return token
}

const SignUp = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().transform((p, ctx) => {
    const n = normalizePhone(p)
    if (!n) ctx.addIssue({ code: 'custom', message: 'phone' })
    return n ?? ''
  }),
  password: z.string().min(PASSWORD_MIN).max(200),
})

export type FieldErrors = Partial<Record<'name' | 'phone' | 'password', string[]>>

export async function signUp(
  input: { name: string; phone: string; password: string },
  ip: string,
  userAgent?: string,
): Promise<Session | { fieldErrors: FieldErrors } | { error: 'phone_taken' } | Limited> {
  const parsed = SignUp.safeParse(input)
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors }
  const { name, phone, password } = parsed.data
  const limited = await limit([[`signup:ip:${ip}`, 10, 3600]])
  if (limited) return limited

  const existing = await db.customer.findUnique({ where: { phone } })
  // A bare row (e.g. a future guest checkout) may claim a password; a real account may not.
  if (existing && (existing.passwordHash || existing.phoneVerifiedAt)) {
    return { error: 'phone_taken' }
  }
  const passwordHash = await hashPassword(password)
  const customer = existing
    ? await db.customer.update({
        where: { id: existing.id },
        data: { name, passwordHash, passwordChangedAt: new Date() },
      })
    : await db.customer.create({ data: { name, phone, passwordHash } })
  return { sessionToken: await createSession(customer.id, { ip, userAgent }) }
}

export async function loginPassword(
  rawPhone: string,
  password: string,
  ip: string,
  userAgent?: string,
): Promise<Session | { error: 'invalid' } | Limited> {
  const phone = normalizePhone(rawPhone)
  const limited = await limit([
    [`login:phone:${phone ?? rawPhone.slice(0, 20)}`, 5, 900],
    [`login:ip:${ip}`, 20, 900],
  ])
  if (limited) return limited
  const customer = phone ? await db.customer.findUnique({ where: { phone } }) : null
  // Same work whether or not the account exists, so the two cannot be told apart.
  const valid = await verifyPassword(customer?.passwordHash ?? DUMMY_HASH, password)
  if (!customer?.passwordHash || !valid) return { error: 'invalid' }
  return { sessionToken: await createSession(customer.id, { ip, userAgent }) }
}

/**
 * Logs in with an SMS code, creating the account for a new phone. The first code proven
 * on an unverified account wipes its password and sessions: whoever registered the number
 * with a password may not be its owner.
 */
export async function loginOtp(
  rawPhone: string,
  code: string,
  ip: string,
  userAgent?: string,
): Promise<Session | { error: 'invalid' | 'expired' } | Limited> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { error: 'invalid' }
  const verified = await verifyOtp(phone, code.trim())
  if ('error' in verified) return verified

  const now = new Date()
  const existing = await db.customer.findUnique({ where: { phone } })
  let customer: Customer
  if (!existing) {
    customer = await db.customer.create({ data: { phone, phoneVerifiedAt: now } })
  } else if (!existing.phoneVerifiedAt) {
    ;[, customer] = await db.$transaction([
      db.customerSession.deleteMany({ where: { customerId: existing.id } }),
      db.customer.update({
        where: { id: existing.id },
        data: { phoneVerifiedAt: now, passwordHash: null, passwordChangedAt: now },
      }),
    ])
  } else {
    customer = existing
  }
  return { sessionToken: await createSession(customer.id, { ip, userAgent }) }
}

/** The signed-in customer for a session token, or null when it is unknown or no longer valid. */
export async function readCustomer(token: string | undefined): Promise<Customer | null> {
  if (!token) return null
  const session = await db.customerSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { customer: true },
  })
  if (!session) return null
  const expired = session.expiresAt.getTime() <= Date.now()
  const stale = session.customer.passwordChangedAt > session.createdAt
  if (expired || stale) {
    await db.customerSession.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.customer
}

export async function logout(token: string | undefined): Promise<void> {
  if (token) await db.customerSession.deleteMany({ where: { tokenHash: sha256(token) } })
}

/** Sets a new password and signs out every session; returns a fresh session for this device. */
export async function changePassword(
  customerId: string,
  current: string,
  next: string,
  meta: Meta = { ip: '127.0.0.1' },
): Promise<Session | { error: 'invalid' } | { fieldErrors: FieldErrors }> {
  if (next.length < PASSWORD_MIN || next.length > 200) {
    return { fieldErrors: { password: ['too_short'] } }
  }
  const customer = await db.customer.findUniqueOrThrow({ where: { id: customerId } })
  if (customer.passwordHash && !(await verifyPassword(customer.passwordHash, current))) {
    return { error: 'invalid' }
  }
  // Set strictly before the new session so that session survives the staleness check.
  const changedAt = new Date(Date.now() - 1)
  await db.$transaction([
    db.customerSession.deleteMany({ where: { customerId } }),
    db.customer.update({
      where: { id: customerId },
      data: { passwordHash: await hashPassword(next), passwordChangedAt: changedAt },
    }),
  ])
  return { sessionToken: await createSession(customerId, meta) }
}
