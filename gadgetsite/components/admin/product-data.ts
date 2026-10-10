import { db } from '@/lib/db'
import { toLocalInput } from '@/lib/admin/forms'
import type { EditorProduct } from './ProductEditor'

/** Everything the product editor's selects need. */
export async function editorOptions() {
  const [brands, categories, badges, carePlans] = await Promise.all([
    db.brand.findMany({ orderBy: { nameEn: 'asc' } }),
    db.category.findMany({ orderBy: [{ sort: 'asc' }, { nameEn: 'asc' }] }),
    db.badge.findMany({ orderBy: { code: 'asc' } }),
    db.carePlan.findMany({ orderBy: { nameEn: 'asc' } }),
  ])
  return {
    brands: brands.map((b) => ({ value: b.id, label: b.nameEn })),
    categories: categories.map((c) => ({ value: c.id, label: c.nameEn })),
    badges: badges.map((b) => ({ value: b.id, label: b.labelEn })),
    carePlans: carePlans.map((c) => ({ value: c.id, label: c.nameEn })),
  }
}

export async function loadEditorProduct(id: string): Promise<EditorProduct | null> {
  const p = await db.product.findUnique({
    where: { id },
    include: { variants: { orderBy: { sort: 'asc' } }, badges: true, carePlans: true },
  })
  if (!p) return null
  return {
    id: p.id,
    slug: p.slug,
    titleEn: p.titleEn,
    titleBn: p.titleBn,
    brandId: p.brandId,
    categoryId: p.categoryId,
    status: p.status,
    preorder: p.preorder,
    bookingAmount: p.bookingAmount?.toString() ?? '',
    lowStockThreshold: String(p.lowStockThreshold),
    warrantyEn: p.warrantyEn,
    warrantyBn: p.warrantyBn,
    descriptionHtmlEn: p.descriptionHtmlEn,
    descriptionHtmlBn: p.descriptionHtmlBn,
    badgeIds: p.badges.map((b) => b.badgeId),
    carePlanIds: p.carePlans.map((c) => c.carePlanId),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color ?? '',
      storage: v.storage ?? '',
      ram: v.ram ?? '',
      region: v.region ?? '',
      offerPrice: String(v.offerPrice),
      regularPrice: String(v.regularPrice),
      salePrice: v.salePrice?.toString() ?? '',
      saleStartsAt: toLocalInput(v.saleStartsAt),
      saleEndsAt: toLocalInput(v.saleEndsAt),
      stock: String(v.stock),
      images: v.images,
    })),
  }
}
