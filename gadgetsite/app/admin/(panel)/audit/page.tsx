import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import { requirePage } from '@/lib/admin/guard'
import { db } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'
import { ui } from '@/lib/ui'

const PAGE = 50
type Props = { searchParams: Promise<{ entity?: string; actor?: string; page?: string }> }

export default async function AuditPage({ searchParams }: Props) {
  await requirePage('audit.read')
  const sp = await searchParams
  const t = await getTranslations('admin')
  const page = Math.max(1, Number(sp.page) || 1)
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.entity ? { entity: sp.entity.slice(0, 40) } : {}),
    ...(sp.actor
      ? { actor: { email: { contains: sp.actor.slice(0, 100), mode: 'insensitive' } } }
      : {}),
  }
  const [rows, total, entities] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { email: true } } },
      orderBy: { at: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    }),
  ])
  return (
    <>
      <PageHeader title={t('nav.audit')} />
      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          <select
            name="entity"
            defaultValue={sp.entity ?? ''}
            className={`${ui.input} max-w-[12rem] !p-2`}
          >
            <option value="">{t('a.allEntities')}</option>
            {entities.map((e) => (
              <option key={e.entity} value={e.entity}>
                {e.entity}
              </option>
            ))}
          </select>
          <input
            name="actor"
            defaultValue={sp.actor ?? ''}
            placeholder={t('email')}
            className={`${ui.input} max-w-xs !p-2`}
          />
          <button className={ui.btnGhost}>{t('p.filter')}</button>
        </form>
        <ul className="grid gap-2" data-testid="audit-list">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/5 p-3">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span>
                    <b
                      className={
                        r.action === 'delete'
                          ? 'text-red-300'
                          : r.action === 'create'
                            ? 'text-ok'
                            : 'text-sand'
                      }
                    >
                      {r.action}
                    </b>{' '}
                    {r.entity} <span className="font-mono text-mut">{r.entityId.slice(0, 16)}</span>
                  </span>
                  <span className="text-mut">
                    {r.actor?.email ?? '—'} · {r.ip ?? ''} ·{' '}
                    {r.at.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                  </span>
                </summary>
                <div className="mt-2 grid gap-2 min-[1101px]:grid-cols-2">
                  <pre className="max-h-72 overflow-auto rounded-lg bg-[#14181b] p-2 text-[11px]">
                    {JSON.stringify(r.before, null, 2) ?? '—'}
                  </pre>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-[#14181b] p-2 text-[11px]">
                    {JSON.stringify(r.after, null, 2) ?? '—'}
                  </pre>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-3 text-mut">
          {page > 1 && (
            <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}>←</Link>
          )}
          {total} · {page}/{Math.max(1, Math.ceil(total / PAGE))}
          {page * PAGE < total && (
            <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}>→</Link>
          )}
        </div>
      </Card>
    </>
  )
}
