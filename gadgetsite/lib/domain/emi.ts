import { assertTaka } from './money'

export type EmiRate = { tenureMonths: number; percent: number }
export type EmiOption = {
  tenureMonths: number
  percent: number
  monthly: number
  total: number
  interest: number
}

/**
 * EMI options for a price from admin-entered rates (TRD §5):
 * monthly = ceil(price × (1 + percent/100) / tenure), total = monthly × tenure.
 * Maths runs in integer hundredths of a percent so fractional rates never drift.
 */
export function emiOptions(price: number, rates: EmiRate[], minAmount: number): EmiOption[] {
  assertTaka(price)
  assertTaka(minAmount)
  if (price < minAmount) return []
  return rates
    .map(({ tenureMonths, percent }) => {
      if (!Number.isSafeInteger(tenureMonths) || tenureMonths <= 0) {
        throw new RangeError(`Invalid EMI tenure: ${tenureMonths}`)
      }
      if (!Number.isFinite(percent) || percent < 0) {
        throw new RangeError(`Invalid EMI rate: ${percent}`)
      }
      const num = price * Math.round(10000 + percent * 100)
      if (!Number.isSafeInteger(num)) throw new RangeError(`EMI amount too large: ${price}`)
      const monthly = Math.ceil(num / (10000 * tenureMonths))
      const total = monthly * tenureMonths
      return { tenureMonths, percent, monthly, total, interest: total - price }
    })
    .sort((a, b) => a.tenureMonths - b.tenureMonths)
}
