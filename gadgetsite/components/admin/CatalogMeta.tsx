import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import {
  deleteBadge,
  deleteBrand,
  deleteCarePlan,
  deleteCategory,
  saveBadge,
  saveBrand,
  saveCarePlan,
  saveCategory,
} from '@/app/admin/(panel)/catalog/actions'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import { formatBDT } from '@/lib/domain/money'
import AdminForm, { type FieldSpec } from './AdminForm'
import DeleteButton from './DeleteButton'
import PageHeader, { Card } from './PageHeader'
import Table from './Table'

export type MetaKind = 'categories' | 'brands' | 'badges' | 'care-plans'
type Row = Record<string, unknown> & { id: string }
type T = Awaited<ReturnType<typeof getTranslations<'admin'>>>

async function config(kind: MetaKind, t: T, selfId?: string) {
  switch (kind) {
    case 'categories': {
      const all = await db.category.findMany({ orderBy: [{ sort: 'asc' }, { nameEn: 'asc' }] })
      const fields: FieldSpec[] = [
        { name: 'slug', label: t('f.slug'), required: true },
        { name: 'nameEn', label: t('f.nameEn'), required: true },
        { name: 'nameBn', label: t('f.nameBn') },
        {
          name: 'parentId',
          label: t('f.parent'),
          type: 'select',
          options: [
            { value: '', label: t('f.noParent') },
            ...all.filter((c) => c.id !== selfId).map((c) => ({ value: c.id, label: c.nameEn })),
          ],
        },
        { name: 'sort', label: t('f.sort'), type: 'number' },
        { name: 'active', label: t('f.active'), type: 'checkbox' },
      ]
      const counts = await db.product.groupBy({ by: ['categoryId'], _count: true })
      const n = new Map(counts.map((c) => [c.categoryId, c._count]))
      return {
        title: t('nav.categories'),
        fields,
        defaults: { sort: 0, active: true },
        save: saveCategory,
        del: deleteCategory,
        load: async (id: string) =>
          db.category.findUnique({ where: { id } }) as Promise<Row | null>,
        rows: all as Row[],
        columns: [t('f.nameEn'), t('f.slug'), t('f.products'), t('f.active')],
        cells: (r: Row) => [r.nameEn, r.slug, n.get(r.id) ?? 0, r.active ? '✓' : '—'],
      }
    }
    case 'brands': {
      const all = await db.brand.findMany({
        orderBy: [{ sort: 'asc' }, { nameEn: 'asc' }],
        include: { _count: { select: { products: true } } },
      })
      return {
        title: t('nav.brands'),
        fields: [
          { name: 'slug', label: t('f.slug'), required: true },
          { name: 'nameEn', label: t('f.nameEn'), required: true },
          { name: 'nameBn', label: t('f.nameBn') },
          { name: 'logoUrl', label: t('f.logo') },
          { name: 'sort', label: t('f.sort'), type: 'number' },
          { name: 'active', label: t('f.active'), type: 'checkbox' },
        ] as FieldSpec[],
        defaults: { sort: 0, active: true },
        save: saveBrand,
        del: deleteBrand,
        load: async (id: string) => db.brand.findUnique({ where: { id } }) as Promise<Row | null>,
        rows: all as unknown as Row[],
        columns: [t('f.nameEn'), t('f.slug'), t('f.products'), t('f.active')],
        cells: (r: Row) => [
          r.nameEn,
          r.slug,
          (r._count as { products: number }).products,
          r.active ? '✓' : '—',
        ],
      }
    }
    case 'badges':
      return {
        title: t('nav.badges'),
        fields: [
          { name: 'code', label: t('f.code'), required: true },
          { name: 'labelEn', label: t('f.labelEn'), required: true },
          { name: 'labelBn', label: t('f.labelBn') },
          { name: 'color', label: t('f.color'), type: 'color' },
        ] as FieldSpec[],
        defaults: { color: '#d2a679' },
        save: saveBadge,
        del: deleteBadge,
        load: async (id: string) => db.badge.findUnique({ where: { id } }) as Promise<Row | null>,
        rows: (await db.badge.findMany({ orderBy: { code: 'asc' } })) as Row[],
        columns: [t('f.code'), t('f.labelEn'), t('f.color')],
        cells: (r: Row) => [
          r.code,
          r.labelEn,
          <span
            key="c"
            className="inline-block size-4 rounded-full align-middle"
            style={{ background: r.color as string }}
          />,
        ],
      }
    case 'care-plans':
      return {
        title: t('nav.carePlans'),
        fields: [
          { name: 'nameEn', label: t('f.nameEn'), required: true },
          { name: 'nameBn', label: t('f.nameBn') },
          { name: 'price', label: t('f.price'), type: 'number' },
          { name: 'coverageMonths', label: t('f.months'), type: 'number' },
          { name: 'descriptionEn', label: t('f.descEn'), wide: true },
          { name: 'descriptionBn', label: t('f.descBn'), wide: true },
        ] as FieldSpec[],
        defaults: { coverageMonths: 12, price: 0 },
        save: saveCarePlan,
        del: deleteCarePlan,
        load: async (id: string) =>
          db.carePlan.findUnique({ where: { id } }) as Promise<Row | null>,
        rows: (await db.carePlan.findMany({ orderBy: { nameEn: 'asc' } })) as Row[],
        columns: [t('f.nameEn'), t('f.price'), t('f.months')],
        cells: (r: Row) => [r.nameEn, formatBDT(r.price as number), r.coverageMonths],
      }
  }
}

const values = (r: Row) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v as string]))

export async function MetaList({ kind }: { kind: MetaKind }) {
  await requirePage('catalog.read')
  const t = await getTranslations('admin')
  const c = await config(kind, t)
  return (
    <>
      <PageHeader title={c.title} />
      <Card title={t('f.newItem')}>
        <AdminForm
          testId={`${kind}-new`}
          action={c.save}
          fields={c.fields}
          values={c.defaults}
          submitLabel={t('create')}
        />
      </Card>
      <Card>
        {c.rows.length ? (
          <Table head={[...c.columns, t('actions')]} testId={`${kind}-table`}>
            {c.rows.map((r) => (
              <tr key={r.id}>
                {c.cells(r).map((cell, i) => (
                  <td key={i}>{cell as React.ReactNode}</td>
                ))}
                <td className="whitespace-nowrap">
                  <Link
                    href={`/admin/${kind}/${r.id}`}
                    className="rounded-md px-2 py-1 text-sand hover:bg-white/5"
                  >
                    {t('edit')}
                  </Link>
                  <DeleteButton action={c.del} id={r.id} />
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-mut">{t('none')}</p>
        )}
      </Card>
    </>
  )
}

export async function MetaEdit({ kind, id }: { kind: MetaKind; id: string }) {
  await requirePage('catalog.write')
  const t = await getTranslations('admin')
  const c = await config(kind, t, id)
  const row = await c.load(id)
  if (!row) notFound()
  const name = String(row.nameEn ?? row.labelEn ?? row.code ?? '')
  return (
    <>
      <PageHeader title={t('f.editing', { name })}>
        <Link href={`/admin/${kind}`} className="text-sand">
          {t('f.back')}
        </Link>
      </PageHeader>
      <Card>
        <AdminForm
          testId={`${kind}-edit`}
          action={c.save}
          fields={c.fields}
          values={values(row)}
          hidden={{ id }}
        />
      </Card>
    </>
  )
}
