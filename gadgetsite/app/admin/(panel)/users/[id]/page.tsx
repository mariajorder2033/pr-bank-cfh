import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ActionForm from '@/components/admin/RoleChecks'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import Table from '@/components/admin/Table'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import { ui } from '@/lib/ui'
import { reset2fa, updateAdmin } from '../actions'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage('users.manage')
  const { id } = await params
  const t = await getTranslations('admin')
  const [user, roles] = await Promise.all([
    db.adminUser.findUnique({
      where: { id },
      include: { roles: true, sessions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    }),
    db.role.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!user) notFound()
  const has = new Set(user.roles.map((r) => r.roleId))
  return (
    <>
      <PageHeader title={user.email}>
        <Link href="/admin/users" className="text-sand">
          {t('f.back')}
        </Link>
      </PageHeader>
      <Card title={t('u.access')}>
        <ActionForm action={updateAdmin} testId="user-form">
          <input type="hidden" name="id" value={user.id} />
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-1 text-[13px]">{t('nav.roles')}</legend>
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="roleIds"
                  value={r.id}
                  defaultChecked={has.has(r.id)}
                  className="accent-[var(--sand)]"
                />{' '}
                {r.name}
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={user.active}
              className="accent-[var(--sand)]"
            />{' '}
            {t('f.active')}
          </label>
          <label className="grid max-w-sm gap-1">
            {t('u.newPassword')}
            <input
              name="password"
              type="text"
              minLength={12}
              placeholder={t('u.keepPassword')}
              className={ui.input}
            />
          </label>
        </ActionForm>
      </Card>
      <Card title={t('u.twoFactor')}>
        <p className="mb-3 text-mut">
          {user.totpConfirmedAt ? t('u.twoFactorOn') : t('u.pending')}
        </p>
        <ActionForm action={reset2fa} submitLabel={t('u.reset2fa')} ghost testId="reset-2fa">
          <input type="hidden" name="id" value={user.id} />
        </ActionForm>
      </Card>
      <Card title={t('u.sessions')}>
        <Table head={[t('u.started'), 'IP', t('u.device')]}>
          {user.sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</td>
              <td>{s.ip}</td>
              <td className="max-w-xs truncate text-mut">{s.userAgent}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
