import { z } from 'zod'
import { SLUG } from '@/lib/domain/slug'

const slug = z.string().max(120).regex(SLUG)

// Admin-editable content is stored as JSON; these schemas are the contract between
// the admin panel (writes, Stage 3+) and the storefront (reads).

export const Bilingual = z.object({ en: z.string(), bn: z.string().optional() })

export const SiteSettings = z.object({
  nameEn: z.string().min(1),
  nameBn: z.string(),
  logoUrl: z.string().nullable(),
  phone: z.string().nullable().optional(),
})
export type SiteSettings = z.infer<typeof SiteSettings>

export const MotionSettings = z.object({
  heroCycleMs: z.number().int().positive(),
  heroSlideMs: z.number().int().positive(),
  heroEasing: z.string().min(1),
  tickerPxPerS: z.number().positive(),
  wipeMs: z.number().int().nonnegative(),
  tileFadeMs: z.number().int().nonnegative(),
})
export type MotionSettings = z.infer<typeof MotionSettings>

export const DeliverySettings = z.object({ freeOver: z.number().int().nonnegative() })
export type DeliverySettings = z.infer<typeof DeliverySettings>

const color = z.string().regex(/^#[0-9a-fA-F]{3,8}$/)
export const ThemeSettings = z.object({
  bg: color,
  surface: color,
  headerFrom: color,
  headerTo: color,
  panel: color,
  sand: color,
  activeRow: color,
  dot: color,
  ink: color,
  success: color,
  sale: color,
})
export type ThemeSettings = z.infer<typeof ThemeSettings>

export const MenuItem = z.object({ label: Bilingual, href: z.string().min(1) })
export type MenuItem = z.infer<typeof MenuItem>
export const MegaMenuItem = MenuItem
export type MegaMenuItem = MenuItem

export const SORTS = ['newest', 'price_asc', 'price_desc', 'discount'] as const

export const ProductQueryInput = z.object({
  category: slug.optional(),
  brands: z.array(slug).optional(),
  badge: slug.optional(),
  inStock: z.boolean().optional(),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().nonnegative().optional(),
  sort: z.enum(SORTS).default('newest'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(48).default(20),
})
export type ProductQueryInput = z.input<typeof ProductQueryInput>
export type ProductQuery = z.output<typeof ProductQueryInput>

const HeroSection = z.object({ type: z.literal('hero'), placement: z.string().min(1) })
const ProductRowSection = z.object({
  type: z.literal('productRow'),
  title: Bilingual,
  band: z.boolean().optional(),
  seeAllHref: z.string().optional(),
  query: ProductQueryInput,
})
export const Section = z.discriminatedUnion('type', [HeroSection, ProductRowSection])
export type Section = z.infer<typeof Section>

/** Valid sections in order; anything that fails its schema is skipped, never fatal. */
export function parseSections(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    const parsed = Section.safeParse(entry)
    return parsed.success ? [parsed.data] : []
  })
}

/** A stored setting, or the fallback when it is missing or invalid. */
export function parseSetting<T>(schema: z.ZodType<T>, raw: unknown, fallback: T): T {
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : fallback
}
