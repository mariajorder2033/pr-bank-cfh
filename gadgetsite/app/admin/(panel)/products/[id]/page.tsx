import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import PageHeader from '@/components/admin/PageHeader'
import ProductEditor from '@/components/admin/ProductEditor'
import { editorOptions, loadEditorProduct } from '@/components/admin/product-data'
import { requirePage } from '@/lib/admin/guard'
import { saveProduct } from '../actions'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage('catalog.write')
  const { id } = await params
  const [t, options, product] = await Promise.all([
    getTranslations('admin'),
    editorOptions(),
    loadEditorProduct(id),
  ])
  if (!product) notFound()
  return (
    <>
      <PageHeader title={product.titleEn}>
        <Link href={`/products/${product.slug}`} className="text-sand">
          {t('p.view')} ↗
        </Link>
      </PageHeader>
      <ProductEditor key={product.id} action={saveProduct} product={product} {...options} />
    </>
  )
}
