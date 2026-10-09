export type StockStatus = 'in_stock' | 'few_left' | 'out_of_stock' | 'preorder'

/** Stock status shown on listings and product pages. Computed, never stored. */
export function stockStatus(
  available: number,
  opts: { lowThreshold: number; preorder: boolean },
): StockStatus {
  if (!Number.isSafeInteger(available)) throw new RangeError(`Invalid stock count: ${available}`)
  if (available <= 0) return opts.preorder ? 'preorder' : 'out_of_stock'
  return available <= opts.lowThreshold ? 'few_left' : 'in_stock'
}
