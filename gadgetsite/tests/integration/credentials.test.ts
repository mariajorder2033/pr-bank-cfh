import { afterAll, beforeEach, expect, test } from 'vitest'
import { db } from '@/lib/db'
import { getSms } from '@/lib/integrations/sms'
import { describeCredential, readCredential, saveCredential } from '@/lib/server/credentials'

beforeEach(async () => {
  process.env.CREDENTIALS_KEY = 'a'.repeat(64)
  delete process.env.SMS_PROVIDER
  await db.serviceCredential.deleteMany()
})
// Leave no saved gateway behind: other suites rely on the environment fallback.
afterAll(async () => {
  await db.serviceCredential.deleteMany()
  await db.$disconnect()
})

test('keys saved in admin are stored encrypted and read back', async () => {
  await saveCredential('sms', 'bulksmsbd', { apiKey: 'LIVEKEY987654', senderId: '8809617' }, true)
  const row = await db.serviceCredential.findUniqueOrThrow({ where: { id: 'sms' } })
  expect(Buffer.from(row.configEncrypted).toString('utf8')).not.toContain('LIVEKEY')
  expect(await readCredential('sms')).toEqual({
    provider: 'bulksmsbd',
    enabled: true,
    config: { apiKey: 'LIVEKEY987654', senderId: '8809617' },
  })
})

test('the admin view shows only the last four characters', async () => {
  await saveCredential('sms', 'bulksmsbd', { apiKey: 'LIVEKEY987654', senderId: '8809617' }, true)
  expect(await describeCredential('sms')).toEqual({
    provider: 'bulksmsbd',
    enabled: true,
    config: { apiKey: '••••7654', senderId: '••••9617' },
  })
})

test('the SMS gateway comes from admin-saved keys, and a disabled one counts as none', async () => {
  expect(await getSms()).toBeNull()
  await saveCredential('sms', 'bulksmsbd', { apiKey: 'K', senderId: 'S' }, true)
  expect(await getSms()).not.toBeNull()
  await saveCredential('sms', 'bulksmsbd', { apiKey: 'K', senderId: 'S' }, false)
  expect(await getSms()).toBeNull()
})
