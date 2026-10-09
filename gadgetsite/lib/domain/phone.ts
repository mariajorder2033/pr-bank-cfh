/** Bangladeshi mobile numbers: 01 + operator digit 3–9 + 8 digits. */
export const BD_MOBILE = /^01[3-9]\d{8}$/

/** `+880 1712-345678`, `8801712345678` or `01712345678` → `01712345678`; anything else → null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '').replace(/^\+?880/, '0')
  return BD_MOBILE.test(digits) ? digits : null
}
