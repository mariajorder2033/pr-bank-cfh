import { expect, test } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

test('hashes with argon2id and verifies only the right password', async () => {
  const hash = await hashPassword('correct horse battery')
  expect(hash.startsWith('$argon2id$')).toBe(true)
  expect(await verifyPassword(hash, 'correct horse battery')).toBe(true)
  expect(await verifyPassword(hash, 'wrong password')).toBe(false)
})
