import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { requestOtp, verifyOtp } from '@/lib/auth/otp'
import { db } from '@/lib/db'
import { connectedRedis, redis } from '@/lib/redis'

const file = join(mkdtempSync(join(tmpdir(), 'otp-')), 'sms.jsonl')
let n = 0
const phone = () => `0171${String(1_000_000 + ++n).slice(-7)}`
const lastCode = (p: string) =>
  readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as { phone: string; text: string })
    .filter((m) => m.phone === p)
    .at(-1)!
    .text.match(/\d{6}/)![0]

beforeEach(async () => {
  process.env.SMS_PROVIDER = 'console'
  process.env.SMS_CONSOLE_FILE = file
  await (await connectedRedis()).flushdb()
})
afterEach(() => vi.useRealTimers())
afterAll(async () => {
  await db.$disconnect()
  redis().disconnect()
})

describe('one-time SMS codes', () => {
  test('a code sent by SMS logs the phone in once', async () => {
    const p = phone()
    expect(await requestOtp(p, '1.1.1.1')).toEqual({ ok: true })
    const code = lastCode(p)
    expect(await verifyOtp(p, code)).toEqual({ ok: true })
    expect(await verifyOtp(p, code)).toEqual({ error: 'invalid' })
  })

  test('five wrong codes burn the code', async () => {
    const p = phone()
    await requestOtp(p, '1.1.1.1')
    const code = lastCode(p)
    const wrong = code === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) expect(await verifyOtp(p, wrong)).toEqual({ error: 'invalid' })
    expect(await verifyOtp(p, code)).toEqual({ error: 'invalid' })
  })

  test('a code expires after five minutes', async () => {
    const p = phone()
    await requestOtp(p, '1.1.1.1')
    const code = lastCode(p)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 6 * 60_000)
    expect(await verifyOtp(p, code)).toEqual({ error: 'expired' })
  })

  test('the fourth request within ten minutes is refused', async () => {
    const p = phone()
    for (let i = 0; i < 3; i++) expect(await requestOtp(p, '2.2.2.2')).toEqual({ ok: true })
    expect(await requestOtp(p, '2.2.2.2')).toEqual({ error: 'rate_limited' })
  })

  test('with no SMS gateway configured the SMS login is disabled', async () => {
    delete process.env.SMS_PROVIDER
    expect(await requestOtp(phone(), '1.1.1.1')).toEqual({ error: 'disabled' })
  })
})
