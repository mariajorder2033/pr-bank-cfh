import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import BulkTable from '@/components/admin/BulkTable'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import { bulkSaveVariants } from '../actions'

export default async function BulkPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  await requirePage('catalog.write')
  const { category } = await searchParams
  const t = await getTranslations('admin')
  const categories = await db.category.findMany({ orderBy: { sort: 'asc' } })
  const variants = await db.variant.findMany({
    where: category ? { product: { category: { slug: category } } } : {},
    include: { product: { select: { titleEn: true } } },
    orderBy: [{ product: { titleEn: 'asc' } }, { sort: 'asc' }],
    take: 1000,
  })
  return (
    <>
      <PageHeader title={t('p.bulkTitle')} />
      <p className="mb-3 text-mut">{t('p.bulkHint')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Link
          href="/admin/products/bulk"
          className={`rounded-full px-3 py-1 text-[12px] ${!category ? 'bg-sand text-ink' : 'bg-pn'}`}
        >
          {t('p.statusAll').split(' ')[0]}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`?category=${c.slug}`}
            className={`rounded-full px-3 py-1 text-[12px] transition-colors ${category === c.slug ? 'bg-sand text-ink' : 'bg-pn hover:bg-[#4a4036]'}`}
          >
            {c.nameEn}
          </Link>
        ))}
      </div>
      <Card>
        <BulkTable
          key={category ?? 'all'}
          action={bulkSaveVariants}
          rows={variants.map((v) => ({
            id: v.id,
            product: v.product.titleEn,
            sku: v.sku,
            offerPrice: v.offerPrice,
            regularPrice: v.regularPrice,
            salePrice: v.salePrice,
            stock: v.stock,
          }))}
        />
      </Card>
    </>
  )
}
