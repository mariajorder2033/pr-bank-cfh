import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { requestOtp } from '@/lib/auth/otp'
import {
  changePassword,
  loginOtp,
  loginPassword,
  logout,
  readCustomer,
  signUp,
} from '@/lib/auth/customer'
import { db } from '@/lib/db'
import { connectedRedis, redis } from '@/lib/redis'

const smsFile = join(mkdtempSync(join(tmpdir(), 'cust-')), 'sms.jsonl')
const lastCode = (phone: string) =>
  readFileSync(smsFile, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as { phone: string; text: string })
    .filter((m) => m.phone === phone)
    .at(-1)!
    .text.match(/\d{6}/)![0]

let n = 0
const phone = () => `0181${String(1_000_000 + ++n).slice(-7)}`
const IP = '9.9.9.9'
const ok = (r: unknown) => (r as { sessionToken: string }).sessionToken

beforeEach(async () => {
  process.env.SMS_PROVIDER = 'console'
  process.env.SMS_CONSOLE_FILE = smsFile
  await (await connectedRedis()).flushdb()
})
afterAll(async () => {
  await db.$disconnect()
  redis().disconnect()
})

describe('password accounts', () => {
  test('sign up, then log in with the same phone and password', async () => {
    const p = phone()
    const signed = await signUp({ name: 'Rafi Ahmed', phone: p, password: 'secret-pass' }, IP)
    expect((await readCustomer(ok(signed)))!.name).toBe('Rafi Ahmed')
    const logged = await loginPassword(p, 'secret-pass', IP, 'Test Browser')
    const c = (await readCustomer(ok(logged)))!
    expect(c.phone).toBe(p)
    expect(c.lastLoginIp).toBe(IP)
    expect(c.lastLoginAt).toBeInstanceOf(Date)
  })

  test('accepts the phone in +880 form', async () => {
    const p = phone()
    await signUp({ name: 'A', phone: p, password: 'secret-pass' }, IP)
    expect(ok(await loginPassword(`+880${p.slice(1)}`, 'secret-pass', IP))).toBeTruthy()
  })

  test('a phone can only sign up once', async () => {
    const p = phone()
    await signUp({ name: 'A', phone: p, password: 'secret-pass' }, IP)
    expect(await signUp({ name: 'B', phone: p, password: 'other-pass' }, IP)).toEqual({
      error: 'phone_taken',
    })
  })

  test('rejects a short password and a bad phone with field errors', async () => {
    const r = await signUp({ name: 'A', phone: '123', password: 'short' }, IP)
    expect(r).toMatchObject({
      fieldErrors: { phone: expect.any(Array), password: expect.any(Array) },
    })
  })

  test('an unknown phone and a wrong password give the same error', async () => {
    const p = phone()
    await signUp({ name: 'A', phone: p, password: 'secret-pass' }, IP)
    expect(await loginPassword(p, 'wrong-pass', IP)).toEqual({ error: 'invalid' })
    expect(await loginPassword(phone(), 'secret-pass', IP)).toEqual({ error: 'invalid' })
  })

  test('the sixth password attempt in fifteen minutes is refused', async () => {
    const p = phone()
    for (let i = 0; i < 5; i++) await loginPassword(p, 'wrong-pass', IP)
    expect(await loginPassword(p, 'wrong-pass', IP)).toEqual({ error: 'rate_limited' })
  })
})

describe('SMS code accounts', () => {
  test('a code logs in a new phone and creates its account', async () => {
    const p = phone()
    await requestOtp(p, IP)
    const r = await loginOtp(p, lastCode(p), IP)
    const c = await readCustomer(ok(r))
    expect(c!.phone).toBe(p)
    expect(c!.phoneVerifiedAt).not.toBeNull()
  })

  test("proving a phone by SMS wipes a stranger's password and sessions", async () => {
    const p = phone()
    const squatter = ok(await signUp({ name: 'X', phone: p, password: 'squatter-pass' }, IP))
    await requestOtp(p, IP)
    expect(ok(await loginOtp(p, lastCode(p), IP))).toBeTruthy()
    expect(await readCustomer(squatter)).toBeNull()
    expect(await loginPassword(p, 'squatter-pass', IP)).toEqual({ error: 'invalid' })
  })
})

describe('sessions', () => {
  test('logout ends the session', async () => {
    const token = ok(await signUp({ name: 'A', phone: phone(), password: 'secret-pass' }, IP))
    await logout(token)
    expect(await readCustomer(token)).toBeNull()
  })

  test('changing the password signs out every other session', async () => {
    const p = phone()
    const first = ok(await signUp({ name: 'A', phone: p, password: 'secret-pass' }, IP))
    const c = (await readCustomer(first))!
    const r = await changePassword(c.id, 'secret-pass', 'new-secret-pass')
    expect(await readCustomer(first)).toBeNull()
    expect(await readCustomer(ok(r))).not.toBeNull()
    expect(await changePassword(c.id, 'wrong', 'another-pass')).toEqual({ error: 'invalid' })
  })

  test('an expired session is refused', async () => {
    const token = ok(await signUp({ name: 'A', phone: phone(), password: 'secret-pass' }, IP))
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 31 * 24 * 3600_000)
    expect(await readCustomer(token)).toBeNull()
    vi.useRealTimers()
  })
})
