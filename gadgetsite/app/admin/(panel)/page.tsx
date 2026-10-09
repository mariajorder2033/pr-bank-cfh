import { getTranslations } from 'next-intl/server'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'

export default async function Dashboard() {
  await requirePage()
  const t = await getTranslations('admin')
  const [products, outOfStock, preorders, customers, audit] = await Promise.all([
    db.product.count({ where: { status: 'active' } }),
    db.variant.count({ where: { stock: { lte: 0 }, product: { status: 'active' } } }),
    db.preorderRequest.count({ where: { status: 'new' } }),
    db.customer.count(),
    db.auditLog.findMany({
      orderBy: { at: 'desc' },
      take: 10,
      include: { actor: { select: { email: true } } },
    }),
  ])
  const tiles = [
    [t('dash.products'), products],
    [t('dash.outOfStock'), outOfStock],
    [t('dash.preorders'), preorders],
    [t('dash.customers'), customers],
  ] as const
  return (
    <>
      <PageHeader title={t('nav.dashboard')} />
      <div className="mb-5 grid grid-cols-2 gap-3 min-[1101px]:grid-cols-4">
        {tiles.map(([label, value], i) => (
          <div
            key={label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-rise rounded-2xl bg-pn p-4"
            data-testid="stat"
          >
            <div className="text-mut">{label}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">
              {value.toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>
      <Card title={t('dash.recent')}>
        {audit.length ? (
          <ul className="grid gap-1.5 text-[13px]">
            {audit.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-1.5"
              >
                <span>
                  <b>{a.action}</b> {a.entity}{' '}
                  <span className="text-mut">{a.entityId.slice(0, 12)}</span>
                </span>
                <span className="text-mut">
                  {a.actor?.email ?? '—'} ·{' '}
                  {a.at.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-mut">{t('none')}</p>
        )}
      </Card>
    </>
  )
}
