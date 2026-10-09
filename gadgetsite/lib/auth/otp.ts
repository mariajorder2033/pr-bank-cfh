import { randomInt } from 'node:crypto'
import { db } from '@/lib/db'
import { getSms } from '@/lib/integrations/sms'
import { RateLimitUnavailable, hit } from '@/lib/server/rate-limit'
import { getSettings } from '@/lib/server/content'
import { sha256 } from './token'

const TTL_MS = 5 * 60_000
const MAX_ATTEMPTS = 5

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')
  return s
}

const codeHash = (phone: string, code: string) => sha256(`${secret()}|${phone}|${code}`)

type Limited = { error: 'rate_limited' | 'unavailable' }

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

/** Sends a fresh 6-digit code to `phone` (already normalised); older codes stop working. */
export async function requestOtp(
  phone: string,
  ip: string,
): Promise<{ ok: true } | { error: 'disabled' | 'send_failed' } | Limited> {
  const sms = await getSms()
  if (!sms) return { error: 'disabled' }
  const limited = await limit([
    [`otp:req:phone:${phone}`, 3, 600],
    [`otp:req:phone-day:${phone}`, 10, 86_400],
    [`otp:req:ip:${ip}`, 10, 3600],
    // Shop-wide SMS spend cap: one abuser cannot run up the gateway bill.
    ['otp:req:all', Number(process.env.SMS_HOURLY_BUDGET ?? 200) || 200, 3600],
  ])
  if (limited) return limited

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await db.$transaction([
    db.otpCode.deleteMany({ where: { phone } }),
    db.otpCode.create({
      data: { phone, codeHash: codeHash(phone, code), expiresAt: new Date(Date.now() + TTL_MS) },
    }),
  ])
  const { site } = await getSettings()
  try {
    await sms.send(phone, `${site.nameEn} code: ${code} (5 min). কোড: ${code}`)
  } catch (e) {
    // The shopper never got this code, so it must not stay valid.
    await db.otpCode.deleteMany({ where: { phone } })
    console.error('[sms] send failed:', e instanceof Error ? e.message : e)
    return { error: 'send_failed' }
  }
  return { ok: true }
}

/** Checks a code; a correct code works once, five wrong tries burn it. */
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ ok: true } | { error: 'invalid' | 'expired' } | Limited> {
  const limited = await limit([[`otp:verify:phone:${phone}`, 10, 600]])
  if (limited) return limited

  const otp = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } })
  if (!otp) return { error: 'invalid' }
  if (otp.expiresAt.getTime() <= Date.now()) return { error: 'expired' }
  // Reserve an attempt atomically before comparing, so parallel guesses cannot exceed five.
  const reserved = await db.otpCode.updateMany({
    where: { id: otp.id, attempts: { lt: MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  })
  if (reserved.count === 0) return { error: 'invalid' }
  if (!/^\d{6}$/.test(code) || otp.codeHash !== codeHash(phone, code)) return { error: 'invalid' }
  // Consuming the row is the single-use check: only one parallel verify can delete it.
  const consumed = await db.otpCode.deleteMany({ where: { id: otp.id } })
  return consumed.count === 1 ? { ok: true } : { error: 'invalid' }
}
