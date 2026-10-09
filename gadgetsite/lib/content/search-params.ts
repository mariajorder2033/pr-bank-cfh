import { ProductQueryInput, SORTS, type ProductQuery } from './schemas'

type Params = Record<string, string | string[] | undefined>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const int = (v: string | undefined) => (v && /^\d{1,9}$/.test(v) ? Number(v) : undefined)

/** Category/search URL params → a valid product query; anything malformed is ignored. */
export function queryFromSearchParams(
  params: Params,
  base: Partial<ProductQuery> = {},
): ProductQuery {
  const brands = one(params.brands)
    ?.split(',')
    .map((b) => b.trim())
    .filter(Boolean)
  const sort = one(params.sort)
  const candidate = {
    ...base,
    brands: brands?.length ? brands : base.brands,
    min: int(one(params.min)),
    max: int(one(params.max)),
    inStock: one(params.inStock) === '1' || undefined,
    sort: SORTS.includes(sort as (typeof SORTS)[number]) ? sort : undefined,
    page: int(one(params.page)) || undefined,
  }
  const parsed = ProductQueryInput.safeParse(candidate)
  return parsed.success ? parsed.data : ProductQueryInput.parse(base)
}
