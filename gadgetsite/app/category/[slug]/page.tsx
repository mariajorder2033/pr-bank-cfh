import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import CategoryFilters from '@/components/CategoryFilters'
import Grid from '@/components/Grid'
import Pagination from '@/components/Pagination'
import { queryFromSearchParams } from '@/lib/content/search-params'
import { text } from '@/lib/i18n'
import { getCategory, getExploreBrands, listProducts } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const category = await getCategory(slug)
  if (!category) notFound()

  const query = queryFromSearchParams(sp, { category: slug })
  const [{ items, total }, brands, locale, t] = await Promise.all([
    listProducts(query),
    getExploreBrands(),
    currentLocale(),
    getTranslations(),
  ])
  const name = text(category.name, locale)

  return (
    <>
      <p className="text-mut">
        <Link href="/">{t('cat.home')}</Link> › {name}
      </p>
      <div className="mt-3 grid gap-5 min-[1101px]:grid-cols-[240px_1fr]">
        <CategoryFilters brands={brands[slug] ?? []} />
        <div className="min-w-0">
          <h1 className="mb-3 text-[22px] font-semibold">
            {name} <small className="text-mut">{t('cat.found', { count: total })}</small>
          </h1>
          <Grid items={items} empty={t('pg.none')} />
          <Pagination
            path={`/category/${slug}`}
            params={sp}
            page={query.page}
            pages={Math.ceil(total / query.pageSize)}
          />
        </div>
      </div>
    </>
  )
}
