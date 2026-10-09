import { getTranslations } from 'next-intl/server'
import Grid from '@/components/Grid'
import { listProducts, searchProducts } from '@/lib/server/cached'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''
  const brand = typeof sp.brand === 'string' ? sp.brand : ''
  const t = await getTranslations('pg')
  const items = q
    ? await searchProducts(q, 48)
    : brand
      ? (await listProducts({ brands: [brand], pageSize: 48 })).items
      : []
  return (
    <>
      <h1 className="mb-4 text-[22px] font-semibold">{q ? t('searchFor', { q }) : t('search')}</h1>
      <Grid items={items} empty={t('none')} />
    </>
  )
}
