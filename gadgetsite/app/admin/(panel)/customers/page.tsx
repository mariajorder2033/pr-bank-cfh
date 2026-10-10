import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import Table from '@/components/admin/Table'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'
import { ui } from '@/lib/ui'

const PAGE = 50
const when = (d: Date | null) =>
  d
    ? d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })
    : '—'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requirePage('customers.read')
  const sp = await searchParams
  const t = await getTranslations('admin')
  const q = (sp.q ?? '').trim().slice(0, 60)
  const page = Math.max(1, Number(sp.page) || 1)
  const where: Prisma.CustomerWhereInput = q
    ? {
        OR: [
          { phone: { contains: q } },
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}
  const [rows, total] = await Promise.all([
    db.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    db.customer.count({ where }),
  ])
  return (
    <>
      <PageHeader title={t('nav.customers')} />
      <Card>
        <form className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder={t('c.search')}
            className={`${ui.input} max-w-xs !p-2`}
          />
          <button className={ui.btnGhost}>{t('search')}</button>
        </form>
        <Table
          head={[
            t('c.phone'),
            t('c.name'),
            t('c.verified'),
            t('u.lastLogin'),
            'IP',
            t('c.orders'),
            t('c.joined'),
          ]}
          testId="customers-table"
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={`/admin/customers/${c.id}`} className="text-sand">
                  {c.phone}
                </Link>
              </td>
              <td>{c.name ?? '—'}</td>
              <td>{c.phoneVerifiedAt ? '✓' : '—'}</td>
              <td className="text-mut">{when(c.lastLoginAt)}</td>
              <td className="font-mono text-[12px]">{c.lastLoginIp ?? '—'}</td>
              <td className="tabular-nums">{c._count.orders}</td>
              <td className="text-mut">{when(c.createdAt)}</td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-mut">
          {total} · {page}/{Math.max(1, Math.ceil(total / PAGE))}
        </p>
      </Card>
    </>
  )
}
