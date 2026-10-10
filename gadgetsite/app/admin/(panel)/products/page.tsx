import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import Table from '@/components/admin/Table'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import { formatBDT } from '@/lib/domain/money'
import { effectivePrice } from '@/lib/domain/pricing'
import type { Prisma } from '@/lib/generated/prisma/client'
import { ui } from '@/lib/ui'

const PAGE = 50
type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> }

export default async function ProductsPage({ searchParams }: Props) {
  await requirePage('catalog.read')
  const sp = await searchParams
  const t = await getTranslations('admin')
  const q = (sp.q ?? '').trim().slice(0, 100)
  const status = ['draft', 'active', 'archived'].includes(sp.status ?? '') ? sp.status : undefined
  const page = Math.max(1, Number(sp.page) || 1)
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status: status as 'draft' | 'active' | 'archived' } : {}),
    ...(q
      ? {
          OR: [
            { titleEn: { contains: q, mode: 'insensitive' } },
            { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  }
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: { brand: true, category: true, variants: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
  ])
  const now = new Date()
  return (
    <>
      <PageHeader title={t('p.title')}>
        <Link href="/admin/products/new" className={ui.btn} data-testid="new-product">
          + {t('p.new')}
        </Link>
      </PageHeader>
      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder={t('p.searchHint')}
            className={`${ui.input} max-w-xs !p-2`}
          />
          <select
            name="status"
            defaultValue={status ?? ''}
            className={`${ui.input} max-w-[12rem] !p-2`}
          >
            <option value="">{t('p.statusAll')}</option>
            <option value="active">{t('p.active')}</option>
            <option value="draft">{t('p.draft')}</option>
            <option value="archived">{t('p.archived')}</option>
          </select>
          <button className={ui.btnGhost}>{t('p.filter')}</button>
        </form>
        <Table
          head={[
            t('p.titleEn'),
            t('p.brand'),
            t('p.category'),
            t('p.price'),
            t('p.stock'),
            t('p.status'),
            '',
          ]}
          testId="products-table"
        >
          {products.map((p) => {
            const prices = p.variants.map((v) => effectivePrice(v, now).price)
            const onSale = p.variants.some((v) => effectivePrice(v, now).onSale)
            const stock = p.variants.reduce((n, v) => n + v.stock, 0)
            return (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="text-sand hover:underline">
                    {p.titleEn}
                  </Link>
                </td>
                <td>{p.brand.nameEn}</td>
                <td>{p.category.nameEn}</td>
                <td className="whitespace-nowrap tabular-nums">
                  {prices.length ? formatBDT(Math.min(...prices)) : '—'}
                  {onSale && (
                    <span className="ml-1.5 rounded-full bg-sale px-1.5 py-0.5 text-[10px] text-white">
                      SALE
                    </span>
                  )}
                </td>
                <td className={`tabular-nums ${stock ? '' : 'text-red-400'}`}>{stock}</td>
                <td>{t(`p.${p.status}`)}</td>
                <td>
                  <Link href={`/products/${p.slug}`} className="text-mut hover:text-sand">
                    ↗
                  </Link>
                </td>
              </tr>
            )
          })}
        </Table>
        <p className="mt-3 text-mut">
          {total} · {page}/{Math.max(1, Math.ceil(total / PAGE))}
        </p>
      </Card>
    </>
  )
}
