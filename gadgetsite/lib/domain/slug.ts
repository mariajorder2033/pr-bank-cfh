/** URL slugs used for products, categories, brands, badges and pages. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Untrusted input (URLs, query strings) must pass this before it reaches the database. */
export const isSlug = (s: string): boolean => s.length <= 120 && SLUG.test(s)
