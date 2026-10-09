import { assertTaka } from './money'

/** Percentage saved, floored. Computed, never stored (golden rule 4). */
export function discountPercent(regular: number, offer: number): number {
  assertTaka(regular)
  assertTaka(offer)
  if (regular <= 0 || offer >= regular) return 0
  // Multiply before dividing: the integer numerator keeps e.g. 100000→71000 at 29, not 28.
  return Math.floor(((regular - offer) * 100) / regular)
}
