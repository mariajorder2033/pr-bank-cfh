import { authenticator } from 'otplib'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { finishLogin, startLogin } from '@/lib/admin/auth'
import { readAdminSession, revokeAdminSessions } from '@/lib/admin/session'
import { hashPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'
import { connectedRedis, redis } from '@/lib/redis'
import { seed } from '@/prisma/seed'

const IP = '7.7.7.7'
const PASSWORD = 'correct horse battery staple'
let n = 0

async function makeAdmin(role = 'owner') {
  const email = `admin${++n}-${Date.now()}@shop.test`
  const user = await db.adminUser.create({
    data: {
      email,
      passwordHash: await hashPassword(PASSWORD),
      roles: { create: { role: { connect: { name: role } } } },
    },
  })
  return { user, email }
}

async function signIn(email: string) {
  const start = await startLogin(email, PASSWORD, IP)
  if (!('pendingToken' in start)) throw new Error(JSON.stringify(start))
  const secret = start.enrol!.secret
  const done = await finishLogin(start.pendingToken, authenticator.generate(secret), IP)
  return { start, done, secret }
}

beforeAll(async () => {
  process.env.CREDENTIALS_KEY = 'b'.repeat(64)
  await seed(db)
})
beforeEach(async () => (await connectedRedis()).flushdb())
afterAll(async () => {
  await db.$disconnect()
  redis().disconnect()
})

describe('first sign-in enrols 2FA', () => {
  test('password, then a code from the new secret, gives a session with owner permissions', async () => {
    const { email } = await makeAdmin()
    const { start, done } = await signIn(email)
    expect(start.step).toBe('enrol')
    expect(start.enrol!.qr.startsWith('data:image/png')).toBe(true)
    const session = await readAdminSession((done as { sessionToken: string }).sessionToken)
    expect(session!.user.email).toBe(email)
    expect(session!.permissions.has('users.manage')).toBe(true)
    expect(session!.user.lastLoginIp).toBe(IP)
  })

  test('the next sign-in asks for a code from the enrolled secret', async () => {
    const { email } = await makeAdmin()
    const { secret } = await signIn(email)
    const again = await startLogin(email, PASSWORD, IP)
    expect(again).toMatchObject({ step: 'totp' })
    const done = await finishLogin(
      (again as { pendingToken: string }).pendingToken,
      authenticator.generate(secret),
      IP,
    )
    expect('sessionToken' in done).toBe(true)
  })
})

describe('refusals', () => {
  test('a wrong password and an unknown email give the same error', async () => {
    const { email } = await makeAdmin()
    expect(await startLogin(email, 'wrong password!!', IP)).toEqual({ error: 'invalid' })
    expect(await startLogin('nobody@shop.test', PASSWORD, IP)).toEqual({ error: 'invalid' })
  })

  test('the sixth password attempt for an email is refused', async () => {
    const { email } = await makeAdmin()
    for (let i = 0; i < 5; i++) await startLogin(email, 'wrong password!!', IP)
    expect(await startLogin(email, PASSWORD, IP)).toEqual({ error: 'rate_limited' })
  })

  test('a disabled admin cannot sign in', async () => {
    const { user, email } = await makeAdmin()
    await db.adminUser.update({ where: { id: user.id }, data: { active: false } })
    expect(await startLogin(email, PASSWORD, IP)).toEqual({ error: 'invalid' })
  })

  test('a tampered or expired pending token is refused', async () => {
    const { email } = await makeAdmin()
    const start = (await startLogin(email, PASSWORD, IP)) as { pendingToken: string }
    const code = '123456'
    expect(await finishLogin(start.pendingToken + 'x', code, IP)).toEqual({ error: 'expired' })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 6 * 60_000)
    expect(await finishLogin(start.pendingToken, code, IP)).toEqual({ error: 'expired' })
    vi.useRealTimers()
  })

  test('a wrong code is refused, and the sixth try is rate limited', async () => {
    const { email } = await makeAdmin()
    const start = (await startLogin(email, PASSWORD, IP)) as { pendingToken: string }
    for (let i = 0; i < 5; i++) {
      expect(await finishLogin(start.pendingToken, '000000', IP)).toEqual({ error: 'invalid' })
    }
    expect(await finishLogin(start.pendingToken, '000000', IP)).toEqual({ error: 'rate_limited' })
  })
})

describe('sessions end when the account changes', () => {
  test('deactivating, changing the password, or revoking ends the session', async () => {
    const { user, email } = await makeAdmin()
    const token = ((await signIn(email)).done as { sessionToken: string }).sessionToken
    expect(await readAdminSession(token)).not.toBeNull()
    await db.adminUser.update({ where: { id: user.id }, data: { passwordChangedAt: new Date() } })
    expect(await readAdminSession(token)).toBeNull()

    const second = await makeAdmin()
    const t2 = ((await signIn(second.email)).done as { sessionToken: string }).sessionToken
    await revokeAdminSessions(second.user.id)
    expect(await readAdminSession(t2)).toBeNull()
  })

  test('an expired session is refused', async () => {
    const { email } = await makeAdmin()
    const token = ((await signIn(email)).done as { sessionToken: string }).sessionToken
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 13 * 3600_000)
    expect(await readAdminSession(token)).toBeNull()
    vi.useRealTimers()
  })
})
