import { assertTaka } from './money'

/** Percentage saved, floored. Computed, never stored (golden rule 4). */
export function discountPercent(regular: number, offer: number): number {
  assertTaka(regular)
  assertTaka(offer)
  if (regular <= 0 || offer >= regular) return 0
  // Multiply before dividing: the integer numerator keeps e.g. 100000→71000 at 29, not 28.
  return Math.floor(((regular - offer) * 100) / regular)
}

export type SaleFields = {
  offerPrice: number
  salePrice: number | null
  saleStartsAt: Date | null
  saleEndsAt: Date | null
}

/**
 * The price a shopper pays now: the sale price while its window is open (start inclusive,
 * end exclusive), otherwise the offer price. A sale price not below the offer is ignored.
 */
export function effectivePrice(
  v: SaleFields,
  now: Date,
): { price: number; onSale: boolean; saleEndsAt: Date | null } {
  const t = now.getTime()
  const open =
    v.salePrice !== null &&
    v.salePrice < v.offerPrice &&
    (!v.saleStartsAt || v.saleStartsAt.getTime() <= t) &&
    (!v.saleEndsAt || t < v.saleEndsAt.getTime())
  return open
    ? { price: v.salePrice!, onSale: true, saleEndsAt: v.saleEndsAt }
    : { price: v.offerPrice, onSale: false, saleEndsAt: null }
}
