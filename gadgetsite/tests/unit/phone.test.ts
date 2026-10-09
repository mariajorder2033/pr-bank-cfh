import { expect, test } from 'vitest'
import { normalizePhone } from '@/lib/domain/phone'

test('normalises Bangladeshi mobile numbers', () => {
  expect(normalizePhone('+880 1712-345678')).toBe('01712345678')
  expect(normalizePhone('8801712345678')).toBe('01712345678')
  expect(normalizePhone(' 01712345678 ')).toBe('01712345678')
})

test('rejects anything that is not a Bangladeshi mobile number', () => {
  expect(normalizePhone('12345')).toBeNull()
  expect(normalizePhone('01212345678')).toBeNull()
  expect(normalizePhone('')).toBeNull()
})
