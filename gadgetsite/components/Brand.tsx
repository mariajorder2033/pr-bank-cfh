import type { SiteSettings } from '@/lib/content/schemas'
import type { Locale } from '@/lib/i18n'
import { loc } from '@/lib/i18n'

/** Site name or logo, both from admin settings. */
export default function Brand({ site, locale }: { site: SiteSettings; locale: Locale }) {
  const name = loc(site, 'name', locale)
  // eslint-disable-next-line @next/next/no-img-element
  return site.logoUrl ? <img src={site.logoUrl} alt={name} className="h-[34px]" /> : <>{name}</>
}
