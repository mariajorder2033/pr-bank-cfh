import type { Locale } from './domain/money'

export type { Locale }
export type Bilingual = { en: string; bn?: string }

/** Reads `${field}En` / `${field}Bn` from a row; Bangla falls back to English when blank. */
export function loc(row: object, field: string, locale: Locale): string {
  const r = row as Record<string, unknown>
  const en = String(r[`${field}En`] ?? '')
  const bn = String(r[`${field}Bn`] ?? '')
  return locale === 'bn' && bn.trim() ? bn : en
}

/** Picks the locale's text from `{ en, bn }`; Bangla falls back to English when blank. */
export function text(value: Bilingual, locale: Locale): string {
  return locale === 'bn' && value.bn?.trim() ? value.bn : value.en
}

/** Builds a `Bilingual` from a row's `${field}En` / `${field}Bn` columns. */
export function bilingual(row: object, field: string): Bilingual {
  const r = row as Record<string, unknown>
  return { en: String(r[`${field}En`] ?? ''), bn: String(r[`${field}Bn`] ?? '') }
}
