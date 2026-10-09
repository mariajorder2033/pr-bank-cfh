import { afterEach, beforeEach, expect, test } from 'vitest'
import { decrypt, encrypt } from '@/lib/crypto'

const KEY = '0'.repeat(63) + '1'
let saved: string | undefined
beforeEach(() => {
  saved = process.env.CREDENTIALS_KEY
  process.env.CREDENTIALS_KEY = KEY
})
afterEach(() => {
  process.env.CREDENTIALS_KEY = saved
})

test('round-trips text, including Bangla', () => {
  expect(decrypt(encrypt('api-key ১২৩'))).toBe('api-key ১২৩')
})

test('two encryptions of the same text differ', () => {
  expect(encrypt('same').equals(encrypt('same'))).toBe(false)
})

test('a tampered blob is rejected', () => {
  const blob = encrypt('secret')
  blob[blob.length - 1] ^= 1
  expect(() => decrypt(blob)).toThrow()
})

test('a missing or malformed key is refused', () => {
  process.env.CREDENTIALS_KEY = 'short'
  expect(() => encrypt('x')).toThrow('CREDENTIALS_KEY must be 64 hex characters')
})
