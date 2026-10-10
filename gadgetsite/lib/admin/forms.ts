import { z } from 'zod'
import { SLUG } from '@/lib/domain/slug'

// Form-field helpers: HTML forms send strings, so coerce here, once.

// Unchecked boxes send no field at all, hence .optional() (Zod 4 needs it for absent keys).
export const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal('')])
  .optional()
  .transform((v) => v === 'on' || v === 'true')

export const intField = (min = 0, max = 1_000_000_000) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const n = typeof v === 'number' ? v : Number(String(v).trim())
    if (String(v).trim() === '' || !Number.isSafeInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: 'custom', message: 'invalid_value' })
      return z.NEVER
    }
    return n
  })

export const optionalInt = (min = 0, max = 1_000_000_000) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || String(v).trim() === '' ? undefined : v))
    .pipe(z.union([z.undefined(), intField(min, max)]))

export const text = (max = 200) => z.string().trim().max(max)
export const requiredText = (max = 200) => z.string().trim().min(1, 'required').max(max)
export const slugField = z.string().trim().toLowerCase().regex(SLUG, 'invalid_value').max(120)

/** '' → null; otherwise a site upload path or an https URL. */
export const imageUrl = z
  .string()
  .trim()
  .transform((v) => v || null)
  .refine(
    (v) => v === null || /^\/uploads\/[\w\-/.]+$/.test(v) || /^https:\/\/[^\s]+$/.test(v),
    'invalid_value',
  )

/** A `datetime-local` value, read as Bangladesh time (UTC+6); '' → null. */
export const optionalDate = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(v)
    const d = m ? new Date(`${m[1]}T${m[2]}:00+06:00`) : new Date(NaN)
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'invalid_value' })
      return z.NEVER
    }
    return d
  })

/** Date → `datetime-local` value in Bangladesh time, for form defaults. */
export const toLocalInput = (d: Date | null | undefined): string =>
  d ? new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 16) : ''
