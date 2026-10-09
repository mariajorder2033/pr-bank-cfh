import { describe, expect, test } from 'vitest'
import { discountPercent } from '@/lib/domain/pricing'

describe('discountPercent', () => {
  test('is the floored percentage saved', () => {
    expect(discountPercent(100000, 85000)).toBe(15)
    expect(discountPercent(1000, 999)).toBe(0)
  })

  test('is exact for prices where dividing first loses a percent to float error', () => {
    expect(discountPercent(100000, 71000)).toBe(29)
    expect(discountPercent(100, 42)).toBe(58)
    expect(discountPercent(15000, 6300)).toBe(58)
  })

  test('is 0 when there is no saving or no regular price', () => {
    expect(discountPercent(1000, 1000)).toBe(0)
    expect(discountPercent(1000, 1200)).toBe(0)
    expect(discountPercent(0, 0)).toBe(0)
  })

  test('rejects amounts that are not whole taka', () => {
    expect(() => discountPercent(1000.5, 1)).toThrow(RangeError)
  })
})
