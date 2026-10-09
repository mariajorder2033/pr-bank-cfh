import { describe, expect, test } from 'vitest'
import { emiOptions } from '@/lib/domain/emi'

describe('emiOptions', () => {
  test('rounds the monthly amount up and derives total and interest from it', () => {
    expect(emiOptions(50000, [{ tenureMonths: 12, percent: 9 }], 5000)).toEqual([
      { tenureMonths: 12, percent: 9, monthly: 4542, total: 54504, interest: 4504 },
    ])
  })

  test('does not overcharge on fractional rates through float error', () => {
    expect(emiOptions(30000, [{ tenureMonths: 6, percent: 3.5 }], 5000)[0].monthly).toBe(5175)
  })

  test('rounds up a zero-interest split that does not divide evenly', () => {
    expect(emiOptions(30001, [{ tenureMonths: 3, percent: 0 }], 5000)[0].monthly).toBe(10001)
  })

  test('offers nothing below the bank minimum', () => {
    expect(emiOptions(4999, [{ tenureMonths: 3, percent: 0 }], 5000)).toEqual([])
  })

  test('sorts by tenure', () => {
    const rates = [12, 3, 6].map((tenureMonths) => ({ tenureMonths, percent: 5 }))
    expect(emiOptions(60000, rates, 5000).map((o) => o.tenureMonths)).toEqual([3, 6, 12])
  })

  test('rejects a non-integer price and a zero tenure', () => {
    expect(() => emiOptions(50000.5, [{ tenureMonths: 3, percent: 0 }], 5000)).toThrow(RangeError)
    expect(() => emiOptions(50000, [{ tenureMonths: 0, percent: 0 }], 5000)).toThrow(RangeError)
  })
})
