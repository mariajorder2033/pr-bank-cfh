'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { FooterSettings, SiteSettings } from '@/lib/content/schemas'
import { text, type Locale } from '@/lib/i18n'
import Brand from './Brand'

const SOCIAL: Record<FooterSettings['socials'][number]['network'], string> = {
  facebook: 'f',
  instagram: '◎',
  youtube: '▷',
  tiktok: '♪',
  linkedin: 'in',
  whatsapp: '✆',
}
const BRANCHES_SHOWN = 3
const address = 'my-2.5 leading-7 text-[#a9c3e8] [&>b]:font-semibold [&>b]:text-white'

/** The storefront footer (layout of the reference prototype); every part comes from admin. */
export default function Footer({
  site,
  footer,
  locale,
}: {
  site: SiteSettings
  footer: FooterSettings
  locale: Locale
}) {
  const t = useTranslations('foot')
  const [more, setMore] = useState(false)
  const branches = more ? footer.branches : footer.branches.slice(0, BRANCHES_SHOWN)
  const hasSide = footer.branches.length > 0

  return (
    <footer
      data-testid="site-footer"
      className="relative z-10 mx-auto mt-16 w-[min(1240px,calc(100%-24px))] rounded-t-[28px] bg-[#12181b] pt-10 text-[#d6dde0] min-[701px]:w-[min(1240px,calc(100%-60px))]"
    >
      <div
        className={`grid gap-8 px-6 text-[11px] min-[701px]:grid-cols-2 min-[701px]:px-9 ${hasSide ? 'min-[1101px]:grid-cols-[1.25fr_repeat(var(--cols),1fr)_1.15fr]' : 'min-[1101px]:grid-cols-[1.25fr_repeat(var(--cols),1fr)]'}`}
        style={{ ['--cols' as string]: Math.max(1, footer.columns.length) }}
      >
        <div>
          <div className="font-serif text-3xl font-extrabold text-white">
            <Brand site={site} locale={locale} />
          </div>
          {site.phone && (
            <p className={address}>
              <a href={`tel:${site.phone}`} className="transition-colors hover:text-sand">
                📞 {site.phone}
              </a>
            </p>
          )}
          {footer.socials.length > 0 && (
            <div className="my-3 flex gap-2.5">
              {footer.socials.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.network}
                  className="grid size-[30px] place-items-center rounded-full bg-[#1d2428] text-xs text-sand transition-[transform,background-color] duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-[#263038]"
                >
                  {SOCIAL[s.network]}
                </a>
              ))}
            </div>
          )}
          {footer.appLinks.length > 0 && (
            <>
              <p className={address}>{t('app')}</p>
              <div className="flex flex-wrap gap-2">
                {footer.appLinks.map((a) => (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#777] bg-black px-3 py-1.5 text-xs text-white transition-colors hover:border-sand"
                  >
                    {a.store === 'google_play' ? '▶ Google Play' : ' App Store'}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

        {footer.columns.map((c) => (
          <nav key={c.title.en} aria-label={text(c.title, locale)}>
            <h4 className="mb-2.5 border-b border-[#2a3236] pb-2.5 text-xs font-medium text-white">
              {text(c.title, locale)}
            </h4>
            {c.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block py-[5px] text-[#e9e1d7] transition-[color,transform] duration-150 ease-smooth hover:translate-x-0.5 hover:text-sand"
              >
                {text(l.label, locale)}
              </Link>
            ))}
          </nav>
        ))}

        {hasSide && (
          <div>
            <h4 className="mb-2.5 border-b border-[#2a3236] pb-2.5 text-xs font-medium text-white">
              {t('branches')}
            </h4>
            {branches.map((b, i) => (
              <p key={i} className={`${address} animate-fi`}>
                <b>{text(b.name, locale)}:</b> {text(b.address, locale)}
                {b.phone && <> · {b.phone}</>}
                {b.mapUrl && (
                  <>
                    {' '}
                    <a
                      href={b.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sand"
                    >
                      {t('map')}
                    </a>
                  </>
                )}
              </p>
            ))}
            {footer.branches.length > BRANCHES_SHOWN && (
              <button
                type="button"
                className="mt-1.5 text-white underline underline-offset-4"
                onClick={() => setMore(!more)}
              >
                {more ? t('less') : t('more')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative mt-9 h-16 border-t border-[#3a3430] text-center">
        <span className="absolute -top-px left-1/2 max-w-[calc(100%-24px)] -translate-x-1/2 truncate rounded-b-3xl border border-t-0 border-[#3a3430] bg-[#161b1e] px-6 py-4 text-[11px] text-[#d8c5ad] min-[701px]:px-9">
          © {new Date().getFullYear()} <Brand site={site} locale={locale} /> |{' '}
          {text(footer.copyright, locale)}
        </span>
      </div>
    </footer>
  )
}
