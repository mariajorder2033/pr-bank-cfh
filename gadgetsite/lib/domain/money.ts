export type Locale = 'en' | 'bn'

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯'

/** Throws unless `n` is a whole-taka amount. */
export function assertTaka(n: number): void {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Not a whole-taka amount: ${n}`)
}

/** Formats whole taka with Bangladeshi grouping: 185990 → ৳1,85,990. */
export function formatBDT(amount: number, locale: Locale = 'en'): string {
  assertTaka(amount)
  const digits = String(Math.abs(amount))
  const last3 = digits.slice(-3)
  const rest = digits.slice(0, -3)
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+$)/g, ',')},${last3}` : last3
  const localised =
    locale === 'bn' ? grouped.replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]) : grouped
  return `${amount < 0 ? '-' : ''}৳${localised}`
}
