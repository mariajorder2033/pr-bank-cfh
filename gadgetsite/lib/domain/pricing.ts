import { assertTaka } from './money'

/** Percentage saved, floored. Computed, never stored (golden rule 4). */
export function discountPercent(regular: number, offer: number): number {
  assertTaka(regular)
  assertTaka(offer)
  if (regular <= 0 || offer >= regular) return 0
  return Math.floor(((regular - offer) / regular) * 100)
}
