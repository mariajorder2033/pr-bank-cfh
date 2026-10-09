import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import type { Locale } from '@/lib/i18n'

export default getRequestConfig(async () => {
  const locale: Locale = (await cookies()).get('locale')?.value === 'bn' ? 'bn' : 'en'
  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
