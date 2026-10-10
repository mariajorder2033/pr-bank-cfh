import { describe, expect, test } from 'vitest'
import { discountPercent, effectivePrice } from '@/lib/domain/pricing'

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

describe('effectivePrice', () => {
  const now = new Date('2026-10-10T12:00:00Z')
  const v = {
    offerPrice: 50000,
    salePrice: 45000 as number | null,
    saleStartsAt: null as Date | null,
    saleEndsAt: null as Date | null,
  }

  test('a sale with no window applies', () => {
    expect(effectivePrice(v, now)).toEqual({ price: 45000, onSale: true, saleEndsAt: null })
  })

  test('applies only inside its window', () => {
    const start = new Date('2026-10-11T00:00:00Z')
    const end = new Date('2026-10-12T00:00:00Z')
    expect(effectivePrice({ ...v, saleStartsAt: start, saleEndsAt: end }, now).onSale).toBe(false)
    expect(
      effectivePrice(
        { ...v, saleStartsAt: start, saleEndsAt: end },
        new Date('2026-10-11T06:00:00Z'),
      ),
    ).toEqual({
      price: 45000,
      onSale: true,
      saleEndsAt: end,
    })
    expect(effectivePrice({ ...v, saleEndsAt: now }, now).onSale).toBe(false)
  })

  test('a sale price at or above the offer price is ignored', () => {
    expect(effectivePrice({ ...v, salePrice: 50000 }, now)).toEqual({
      price: 50000,
      onSale: false,
      saleEndsAt: null,
    })
    expect(effectivePrice({ ...v, salePrice: null }, now).price).toBe(50000)
  })
})
