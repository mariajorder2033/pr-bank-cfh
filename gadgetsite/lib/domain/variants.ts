// Variant picking on the product page: pure, so it is unit-tested apart from React.

export const DIMENSIONS = ['color', 'storage', 'ram', 'region'] as const
export type Dimension = (typeof DIMENSIONS)[number]
export type VariantOptions = { id: string } & Record<Dimension, string | null>

/** The distinct values of each dimension, in variant order; dimensions with none are omitted. */
export function optionValues(variants: VariantOptions[]): Partial<Record<Dimension, string[]>> {
  const out: Partial<Record<Dimension, string[]>> = {}
  for (const dim of DIMENSIONS) {
    const values = [...new Set(variants.map((v) => v[dim]).filter((x): x is string => !!x))]
    if (values.length) out[dim] = values
  }
  return out
}

/**
 * The variant to select after the shopper picks `value` for `dim`: one that has that value
 * and keeps as many of the current choices as possible (first such variant wins ties).
 */
export function pickVariant<V extends VariantOptions>(
  variants: V[],
  current: V,
  dim: Dimension,
  value: string,
): V {
  const candidates = variants.filter((v) => v[dim] === value)
  if (!candidates.length) return current
  const score = (v: V) => DIMENSIONS.filter((d) => d !== dim && v[d] === current[d]).length
  return candidates.reduce((best, v) => (score(v) > score(best) ? v : best))
}
