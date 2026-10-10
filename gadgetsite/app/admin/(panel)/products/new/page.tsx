import { getTranslations } from 'next-intl/server'
import PageHeader from '@/components/admin/PageHeader'
import ProductEditor from '@/components/admin/ProductEditor'
import { editorOptions } from '@/components/admin/product-data'
import { requirePage } from '@/lib/admin/guard'
import { saveProduct } from '../actions'

export default async function NewProductPage() {
  await requirePage('catalog.write')
  const [t, options] = await Promise.all([getTranslations('admin'), editorOptions()])
  return (
    <>
      <PageHeader title={t('p.new')} />
      <ProductEditor
        action={saveProduct}
        {...options}
        product={{
          slug: '',
          titleEn: '',
          titleBn: '',
          brandId: options.brands[0]?.value ?? '',
          categoryId: options.categories[0]?.value ?? '',
          status: 'draft',
          preorder: false,
          bookingAmount: '',
          lowStockThreshold: '3',
          warrantyEn: '',
          warrantyBn: '',
          descriptionHtmlEn: '',
          descriptionHtmlBn: '',
          badgeIds: [],
          carePlanIds: [],
          variants: [
            {
              sku: '',
              color: '',
              storage: '',
              ram: '',
              region: '',
              offerPrice: '',
              regularPrice: '',
              salePrice: '',
              saleStartsAt: '',
              saleEndsAt: '',
              stock: '0',
              images: [],
            },
          ],
        }}
      />
    </>
  )
}
