import { z } from 'zod'
import { SLUG } from '@/lib/domain/slug'

// Form-field helpers: HTML forms send strings, so coerce here, once.

export const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal(''), z.undefined()])
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
    .union([z.string(), z.number(), z.undefined()])
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

export const optionalDate = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null
    // datetime-local values are Bangladesh time (UTC+6).
    const d = new Date(
      /[zZ]|[+-]\d\d:\d\d$/.test(v) ? v : `${v}:00+06:00`.replace(/:00:00\+/, ':00+'),
    )
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'invalid_value' })
      return z.NEVER
    }
    return d
  })
