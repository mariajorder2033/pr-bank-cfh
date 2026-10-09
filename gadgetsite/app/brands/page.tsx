import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { text } from '@/lib/i18n'
import { listBrands } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'

export default async function BrandsPage() {
  const [brands, locale, t] = await Promise.all([
    listBrands(),
    currentLocale(),
    getTranslations('pg'),
  ])
  return (
    <>
      <h1 className="mb-4 text-[22px] font-semibold">{t('brands')}</h1>
      <div className="grid grid-cols-2 gap-3.5 min-[701px]:grid-cols-4 min-[1101px]:grid-cols-6">
        {brands
          .filter((b) => b.productCount > 0)
          .map((b) => (
            <Link
              key={b.slug}
              href={`/search?brand=${b.slug}`}
              className="rounded-2xl bg-white p-5 text-center text-ink transition hover:-translate-y-1"
            >
              <b className="block text-base">{text(b.name, locale)}</b>
              <small className="text-[#666]">{t('products', { count: b.productCount })}</small>
            </Link>
          ))}
      </div>
    </>
  )
}
