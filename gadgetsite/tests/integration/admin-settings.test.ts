import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('next/headers', () => import('../support/admin-mocks').then((m) => m.headersModule))
vi.mock('next/navigation', () => import('../support/admin-mocks').then((m) => m.navigationModule))
vi.mock('next/cache', () => import('../support/admin-mocks').then((m) => m.cacheModule))

import { saveMotion, saveServiceSms, saveSite, saveTheme } from '@/lib/admin/actions/settings'
import { db } from '@/lib/db'
import { defaultTheme } from '@/lib/content/defaults'
import { getSettings } from '@/lib/server/content'
import { readCredential } from '@/lib/server/credentials'
import { seed } from '@/prisma/seed'
import { form, jar, revalidated, signInAs } from '../support/admin-mocks'

beforeAll(async () => {
  process.env.CREDENTIALS_KEY = 'c'.repeat(64)
  await seed(db)
})
beforeEach(() => {
  jar.clear()
  revalidated.length = 0
})
afterAll(async () => {
  await db.serviceCredential.deleteMany()
  await db.$disconnect()
})

describe('site settings', () => {
  test('saving the site name updates settings, audits and revalidates', async () => {
    await signInAs('owner')
    const r = await saveSite(
      {},
      form({ nameEn: 'Gadget BD', nameBn: 'গ্যাজেট বিডি', phone: '01712345678', logoUrl: '' }),
    )
    expect(r.ok).toBe(true)
    expect((await getSettings()).site).toMatchObject({ nameEn: 'Gadget BD', phone: '01712345678' })
    expect(
      await db.auditLog.count({ where: { entity: 'setting', entityId: 'site' } }),
    ).toBeGreaterThan(0)
    expect(revalidated).toContain('settings')
  })

  test('a bad colour or a zero cycle time is refused', async () => {
    await signInAs('owner')
    const theme = Object.fromEntries(
      Object.entries(defaultTheme).map(([k, v]) => [k, k === 'sand' ? 'red' : v]),
    )
    expect((await saveTheme({}, form(theme))).fieldErrors?.sand).toBeTruthy()
    const r = await saveMotion(
      {},
      form({
        heroCycleMs: '0',
        heroSlideMs: '280',
        heroEasing: 'ease',
        tickerPxPerS: '78',
        wipeMs: '200',
        tileFadeMs: '280',
      }),
    )
    expect(r.fieldErrors?.heroCycleMs).toBeTruthy()
  })

  test('a support user cannot change settings', async () => {
    await signInAs('support')
    expect(await saveSite({}, form({ nameEn: 'X', nameBn: '', phone: '', logoUrl: '' }))).toEqual({
      ok: false,
      error: 'forbidden',
    })
  })
})

describe('SMS gateway keys', () => {
  test('keys are stored encrypted, audited masked, and a blank key keeps the old one', async () => {
    await signInAs('owner')
    const r = await saveServiceSms(
      {},
      form({
        provider: 'bulksmsbd',
        apiKey: 'LIVE-KEY-123456',
        senderId: '8809617000001',
        enabled: 'on',
      }),
    )
    expect(r.ok).toBe(true)
    expect(await readCredential('sms')).toMatchObject({
      enabled: true,
      config: { apiKey: 'LIVE-KEY-123456' },
    })
    const audit = await db.auditLog.findFirstOrThrow({
      where: { entity: 'service', entityId: 'sms' },
      orderBy: { at: 'desc' },
    })
    expect(JSON.stringify(audit.after)).not.toContain('LIVE-KEY')
    expect(JSON.stringify(audit.after)).toContain('••••3456')

    await saveServiceSms(
      {},
      form({ provider: 'bulksmsbd', apiKey: '', senderId: '8809617000002', enabled: 'on' }),
    )
    expect(await readCredential('sms')).toMatchObject({
      config: { apiKey: 'LIVE-KEY-123456', senderId: '8809617000002' },
    })
  })

  test('a first save without a key is refused', async () => {
    await db.serviceCredential.deleteMany()
    await signInAs('owner')
    const r = await saveServiceSms(
      {},
      form({ provider: 'bulksmsbd', apiKey: '', senderId: 'S', enabled: 'on' }),
    )
    expect(r.fieldErrors?.apiKey).toBeTruthy()
  })
})
