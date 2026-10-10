import { getTranslations } from 'next-intl/server'
import ActionForm from '@/components/admin/RoleChecks'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import { saveRoleMatrix } from '../users/actions'

export default async function RolesPage() {
  await requirePage('users.manage')
  const t = await getTranslations('admin')
  const [roles, permissions] = await Promise.all([
    db.role.findMany({ include: { permissions: true }, orderBy: { name: 'asc' } }),
    db.permission.findMany({ orderBy: { code: 'asc' } }),
  ])
  return (
    <>
      <PageHeader title={t('nav.roles')} />
      <Card>
        <ActionForm action={saveRoleMatrix} testId="roles-form">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-center text-[12px]">
              <thead>
                <tr className="border-b border-white/10 text-mut">
                  <th className="px-2 py-2 text-left">{t('u.permission')}</th>
                  {roles.map((r) => (
                    <th key={r.id} className="px-2">
                      {r.name}
                      <input type="hidden" name={`role.${r.id}`} value="1" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[.03]">
                    <td className="px-2 py-1.5 text-left font-mono">{p.code}</td>
                    {roles.map((r) => (
                      <td key={r.id}>
                        <input
                          type="checkbox"
                          name={`grants.${r.id}`}
                          value={p.id}
                          defaultChecked={
                            r.name === 'owner' || r.permissions.some((x) => x.permissionId === p.id)
                          }
                          disabled={r.name === 'owner'}
                          aria-label={`${r.name} ${p.code}`}
                          className="size-4 accent-[var(--sand)]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-mut">{t('u.ownerNote')}</p>
        </ActionForm>
      </Card>
    </>
  )
}
