import { createHmac, timingSafeEqual } from 'node:crypto'
import { decrypt, encrypt } from '@/lib/crypto'
import { db } from '@/lib/db'
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password'
import { RateLimitUnavailable, hit } from '@/lib/server/rate-limit'
import { getSettings } from '@/lib/server/content'
import { createAdminSession } from './session'
import { newTotpSecret, totpQrDataUrl, totpUri, verifyTotp } from './totp'

// Admin sign-in (spec §8): password, then a TOTP code. The first sign-in enrols the
// authenticator app; nobody reaches the panel without a confirmed second factor.

const PENDING_TTL_MS = 5 * 60_000
type Limited = { error: 'rate_limited' | 'unavailable' }
type Meta = { userAgent?: string }

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')
  return s
}

const sign = (payload: string) =>
  createHmac('sha256', secret()).update(`admin-pending|${payload}`).digest('base64url')

/** `userId.exp.enrolSecret?` — the enrolment secret travels encrypted, never in the DB. */
function pendingToken(userId: string, enrolSecret?: string): string {
  const exp = Date.now() + PENDING_TTL_MS
  const enc = enrolSecret ? encrypt(enrolSecret).toString('base64url') : ''
  const payload = `${userId}.${exp}.${enc}`
  return `${payload}.${sign(payload)}`
}

function readPending(token: string): { userId: string; enrolSecret?: string } | null {
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [userId, exp, enc, mac] = parts
  const expected = Buffer.from(sign(`${userId}.${exp}.${enc}`))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  if (!(Number(exp) > Date.now())) return null
  try {
    return { userId, enrolSecret: enc ? decrypt(Buffer.from(enc, 'base64url')) : undefined }
  } catch {
    return null
  }
}

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

export type StartResult =
  | { step: 'totp' | 'enrol'; pendingToken: string; enrol?: { secret: string; qr: string } }
  | { error: 'invalid' }
  | Limited

export async function startLogin(
  rawEmail: string,
  password: string,
  ip: string,
): Promise<StartResult> {
  const email = rawEmail.trim().toLowerCase().slice(0, 200)
  const limited = await limit([
    [`admin:login:email:${email}`, 5, 900],
    [`admin:login:ip:${ip}`, 20, 900],
  ])
  if (limited) return limited
  const user = await db.adminUser.findUnique({ where: { email } })
  // Same work whether or not the account exists.
  const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password)
  if (!user || !user.active || !valid) return { error: 'invalid' }

  if (user.totpConfirmedAt && user.totpSecretEncrypted) {
    return { step: 'totp', pendingToken: pendingToken(user.id) }
  }
  const enrolSecret = newTotpSecret()
  const { site } = await getSettings()
  const qr = await totpQrDataUrl(totpUri(enrolSecret, email, `${site.nameEn} admin`))
  return {
    step: 'enrol',
    pendingToken: pendingToken(user.id, enrolSecret),
    enrol: { secret: enrolSecret, qr },
  }
}

export async function finishLogin(
  token: string,
  code: string,
  ip: string,
  meta: Meta = {},
): Promise<{ sessionToken: string } | { error: 'invalid' | 'expired' } | Limited> {
  const pending = readPending(token)
  if (!pending) return { error: 'expired' }
  const limited = await limit([[`admin:totp:${pending.userId}`, 5, 300]])
  if (limited) return limited

  const user = await db.adminUser.findUnique({ where: { id: pending.userId } })
  if (!user || !user.active) return { error: 'invalid' }
  const enrolling = !!pending.enrolSecret
  const secretToCheck = enrolling
    ? pending.enrolSecret!
    : user.totpSecretEncrypted
      ? decrypt(user.totpSecretEncrypted)
      : null
  if (!secretToCheck || !verifyTotp(secretToCheck, code)) return { error: 'invalid' }

  if (enrolling) {
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        totpSecretEncrypted: new Uint8Array(encrypt(secretToCheck)),
        totpConfirmedAt: new Date(),
      },
    })
  }
  return { sessionToken: await createAdminSession(user.id, { ip, userAgent: meta.userAgent }) }
}
