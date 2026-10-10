import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import ActionForm from '@/components/admin/RoleChecks'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import Table from '@/components/admin/Table'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import { ui } from '@/lib/ui'
import { inviteAdmin } from './actions'

const when = (d: Date | null) =>
  d
    ? d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })
    : '—'

export default async function UsersPage() {
  await requirePage('users.manage')
  const t = await getTranslations('admin')
  const [users, roles] = await Promise.all([
    db.adminUser.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { email: 'asc' },
    }),
    db.role.findMany({ orderBy: { name: 'asc' } }),
  ])
  return (
    <>
      <PageHeader title={t('nav.users')} />
      <Card title={t('u.invite')}>
        <ActionForm action={inviteAdmin} submitLabel={t('u.invite')} testId="invite-form">
          <div className="grid gap-3 min-[701px]:grid-cols-2">
            <label className="grid gap-1">
              {t('email')}
              <input name="email" type="email" required className={ui.input} />
            </label>
            <label className="grid gap-1">
              {t('u.tempPassword')}
              <input name="password" type="text" minLength={12} required className={ui.input} />
            </label>
          </div>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-1 text-[13px]">{t('nav.roles')}</legend>
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="roleIds"
                  value={r.id}
                  className="accent-[var(--sand)]"
                />{' '}
                {r.name}
              </label>
            ))}
          </fieldset>
          <p className="text-[12px] text-mut">{t('u.inviteHint')}</p>
        </ActionForm>
      </Card>
      <Card>
        <Table
          head={[t('email'), t('nav.roles'), t('u.twoFactor'), t('u.lastLogin'), t('f.active'), '']}
          testId="users-table"
        >
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.roles.map((r) => r.role.name).join(', ')}</td>
              <td>{u.totpConfirmedAt ? '✓' : t('u.pending')}</td>
              <td className="text-mut">
                {when(u.lastLoginAt)}
                {u.lastLoginIp && <> · {u.lastLoginIp}</>}
              </td>
              <td>{u.active ? '✓' : '—'}</td>
              <td>
                <Link href={`/admin/users/${u.id}`} className="text-sand">
                  {t('edit')}
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
