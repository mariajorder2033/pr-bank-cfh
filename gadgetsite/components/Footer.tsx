import Link from 'next/link'
import type { SiteSettings, MenuItem } from '@/lib/content/schemas'
import { text, type Locale } from '@/lib/i18n'
import Brand from './Brand'

export default function Footer({
  site,
  links,
  locale,
}: {
  site: SiteSettings
  links: MenuItem[]
  locale: Locale
}) {
  return (
    <footer className="relative z-10 mx-auto mt-16 w-[min(1240px,calc(100%-24px))] rounded-t-[28px] bg-[#12181b] pt-10 text-[#d6dde0] min-[701px]:w-[min(1240px,calc(100%-60px))]">
      <div className="grid gap-6 px-6 text-[11px] min-[701px]:grid-cols-2 min-[701px]:px-9 min-[1101px]:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="font-serif text-3xl font-extrabold text-white">
            <Brand site={site} locale={locale} />
          </div>
          {site.phone && (
            <p className="my-2.5 text-[#a9c3e8]">
              <a href={`tel:${site.phone}`}>📞 {site.phone}</a>
            </p>
          )}
        </div>
        <nav className="grid grid-cols-2 gap-x-6 min-[1101px]:grid-cols-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-[5px] text-[#e9e1d7] transition hover:text-sand"
            >
              {text(l.label, locale)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-9 border-t border-[#3a3430] py-5 text-center text-[11px] text-[#d8c5ad]">
        © {new Date().getFullYear()} <Brand site={site} locale={locale} />
      </div>
    </footer>
  )
}
