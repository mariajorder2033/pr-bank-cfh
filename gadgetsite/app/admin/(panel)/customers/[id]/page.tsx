import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ActionForm from '@/components/admin/RoleChecks'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import Table from '@/components/admin/Table'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import { formatBDT } from '@/lib/domain/money'
import { signOutCustomer } from '../../users/actions'

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePage('customers.read')
  const { id } = await params
  const t = await getTranslations('admin')
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      sessions: { orderBy: { createdAt: 'desc' }, take: 20 },
      orders: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!c) notFound()
  const dt = (d: Date) =>
    d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })
  return (
    <>
      <PageHeader title={`${c.name ?? c.phone}`}>
        <Link href="/admin/customers" className="text-sand">
          {t('f.back')}
        </Link>
      </PageHeader>
      <Card>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] min-[701px]:grid-cols-4">
          <dt className="text-mut">{t('c.phone')}</dt>
          <dd>{c.phone}</dd>
          <dt className="text-mut">{t('email')}</dt>
          <dd>{c.email ?? '—'}</dd>
          <dt className="text-mut">{t('c.verified')}</dt>
          <dd>{c.phoneVerifiedAt ? dt(c.phoneVerifiedAt) : '—'}</dd>
          <dt className="text-mut">{t('u.lastLogin')}</dt>
          <dd>
            {c.lastLoginAt ? dt(c.lastLoginAt) : '—'}{' '}
            {c.lastLoginIp && <span className="font-mono">· {c.lastLoginIp}</span>}
          </dd>
        </dl>
      </Card>
      <Card title={t('u.sessions')}>
        <Table head={[t('u.started'), 'IP', t('u.device')]} testId="customer-sessions">
          {c.sessions.map((s) => (
            <tr key={s.id}>
              <td>{dt(s.createdAt)}</td>
              <td className="font-mono">{s.ip}</td>
              <td className="max-w-xs truncate text-mut">{s.userAgent}</td>
            </tr>
          ))}
        </Table>
        {admin.permissions.has('users.manage') && c.sessions.length > 0 && (
          <div className="mt-3">
            <ActionForm action={signOutCustomer} submitLabel={t('c.signOutAll')} ghost>
              <input type="hidden" name="id" value={c.id} />
            </ActionForm>
          </div>
        )}
      </Card>
      <Card title={t('c.orders')}>
        {c.orders.length ? (
          <Table head={['#', t('p.status'), t('p.price'), t('c.joined')]}>
            {c.orders.map((o) => (
              <tr key={o.id}>
                <td>{o.number}</td>
                <td>{o.status}</td>
                <td>{formatBDT(o.grandTotal)}</td>
                <td>{dt(o.createdAt)}</td>
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
