import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Section } from '@/lib/content/schemas'
import { text, type Locale } from '@/lib/i18n'
import { getBanners, listProducts } from '@/lib/server/cached'
import { ui } from '@/lib/ui'
import Grid from './Grid'
import HeroSlider from './HeroSlider'

/** Renders Home-builder sections in order (home, online exclusive, landing pages). */
export default async function Sections({
  sections,
  locale,
}: {
  sections: Section[]
  locale: Locale
}) {
  const t = await getTranslations()
  return (
    <>
      {await Promise.all(
        sections.map(async (s, i) => {
          if (s.type === 'hero') {
            return <HeroSlider key={i} banners={await getBanners(s.placement)} />
          }
          const { items } = await listProducts(s.query)
          if (!items.length) return null
          return (
            <section
              key={i}
              className={s.band ? 'my-6 rounded-2xl bg-band px-3 py-7 min-[701px]:px-5' : 'my-6'}
            >
              <h2 className="mb-3.5 flex items-center justify-between text-[22px] font-semibold">
                {text(s.title, locale)}
                {s.seeAllHref && (
                  <Link href={s.seeAllHref} className={ui.seeAll}>
                    {t('btn.seeAll')}
                  </Link>
                )}
              </h2>
              <Grid items={items} empty={t('pg.none')} cols={5} />
            </section>
          )
        }),
      )}
    </>
  )
}
