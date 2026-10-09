import { getTranslations } from 'next-intl/server'
import Sections from '@/components/Sections'
import { getLayout } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'

export default async function OnlineExclusivePage() {
  const [sections, locale, t] = await Promise.all([
    getLayout('online-exclusive'),
    currentLocale(),
    getTranslations('pg'),
  ])
  return (
    <>
      <h1 className="text-[22px] font-semibold">{t('exclusive')}</h1>
      {sections.length ? (
        <Sections sections={sections} locale={locale} />
      ) : (
        <p className="py-16 text-center text-mut">{t('none')}</p>
      )}
    </>
  )
}
