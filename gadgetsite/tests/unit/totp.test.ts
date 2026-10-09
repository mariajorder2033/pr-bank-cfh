import { authenticator } from 'otplib'
import { afterEach, expect, test, vi } from 'vitest'
import { newTotpSecret, totpUri, verifyTotp } from '@/lib/admin/totp'

afterEach(() => vi.useRealTimers())

test('accepts the current code from an authenticator app', () => {
  const secret = newTotpSecret()
  expect(verifyTotp(secret, authenticator.generate(secret))).toBe(true)
})

test('refuses a code from three steps ago, and junk', () => {
  const secret = newTotpSecret()
  vi.useFakeTimers({ toFake: ['Date'] })
  const old = authenticator.generate(secret)
  vi.setSystemTime(Date.now() + 90_000)
  expect(verifyTotp(secret, old)).toBe(false)
  expect(verifyTotp(secret, 'abcdef')).toBe(false)
})

test('builds an otpauth URI naming the shop and the admin', () => {
  const uri = totpUri('JBSWY3DPEHPK3PXP', 'owner@shop.bd', 'gadgetsite')
  expect(uri.startsWith('otpauth://totp/')).toBe(true)
  expect(uri).toContain('issuer=gadgetsite')
  expect(decodeURIComponent(uri)).toContain('owner@shop.bd')
})
