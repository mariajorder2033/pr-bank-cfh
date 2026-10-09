import { describe, expect, test } from 'vitest'
import { formatBDT } from '@/lib/domain/money'

describe('formatBDT', () => {
  test('uses Bangladeshi digit grouping', () => {
    expect(formatBDT(185990)).toBe('৳1,85,990')
    expect(formatBDT(999)).toBe('৳999')
    expect(formatBDT(0)).toBe('৳0')
    expect(formatBDT(10000000)).toBe('৳1,00,00,000')
  })

  test('puts the sign before the currency symbol', () => {
    expect(formatBDT(-500)).toBe('-৳500')
  })

  test('uses Bangla digits for bn', () => {
    expect(formatBDT(185990, 'bn')).toBe('৳১,৮৫,৯৯০')
  })

  test('rejects amounts that are not whole taka', () => {
    expect(() => formatBDT(1.5)).toThrow(RangeError)
    expect(() => formatBDT(NaN)).toThrow(RangeError)
    expect(() => formatBDT(Infinity)).toThrow(RangeError)
  })
})
