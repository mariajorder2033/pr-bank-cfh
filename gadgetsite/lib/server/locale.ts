import { getLocale } from 'next-intl/server'
import type { Locale } from '@/lib/i18n'

/** The request's storefront locale (cookie `locale`, default English). */
export async function currentLocale(): Promise<Locale> {
  return (await getLocale()) === 'bn' ? 'bn' : 'en'
}
