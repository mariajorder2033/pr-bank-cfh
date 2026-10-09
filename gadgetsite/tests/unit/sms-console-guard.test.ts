import { afterEach, expect, test, vi } from 'vitest'

vi.mock('@/lib/server/credentials', () => ({ readCredential: async () => null }))
import { getSms } from '@/lib/integrations/sms'

afterEach(() => vi.unstubAllEnvs())

test('the console gateway never runs in production unless explicitly allowed for e2e', async () => {
  vi.stubEnv('SMS_PROVIDER', 'console')
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('SMS_CONSOLE_ALLOWED', '')
  expect(await getSms()).toBeNull()
  vi.stubEnv('SMS_CONSOLE_ALLOWED', '1')
  expect(await getSms()).not.toBeNull()
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('SMS_CONSOLE_ALLOWED', '')
  expect(await getSms()).not.toBeNull()
})
