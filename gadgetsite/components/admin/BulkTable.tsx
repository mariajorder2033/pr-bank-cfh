'use client'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import type { ActionState } from '@/lib/admin/action'
import { ui } from '@/lib/ui'

type Row = {
  id: string
  product: string
  sku: string
  offerPrice: number
  regularPrice: number
  salePrice: number | null
  stock: number
}

export default function BulkTable({
  rows,
  action,
}: {
  rows: Row[]
  action: (p: ActionState, f: FormData) => Promise<ActionState>
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState(action, {})
  const cell = (i: number, k: string, v: number | null) => (
    <input
      name={`rows.${i}.${k}`}
      defaultValue={v ?? ''}
      inputMode="numeric"
      aria-invalid={!!state.fieldErrors?.[`rows.${i}.${k}`]}
      className="w-24 rounded-md border border-[#3d352d] bg-[#14181b] px-2 py-1 text-right tabular-nums transition-colors focus:border-sand aria-[invalid=true]:border-red-500"
    />
  )
  return (
    <form action={formAction} data-testid="bulk-form">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/10 text-mut">
              <th className="px-2 py-2">{t('p.titleEn')}</th>
              <th className="px-2">{t('p.sku')}</th>
              <th className="px-2">{t('p.offer')}</th>
              <th className="px-2">{t('p.regular')}</th>
              <th className="px-2">{t('p.sale')}</th>
              <th className="px-2">{t('p.stock')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[.03]">
                <td className="px-2 py-1.5">
                  <input type="hidden" name={`rows.${i}.id`} value={r.id} />
                  {r.product}
                </td>
                <td className="px-2 text-mut">{r.sku}</td>
                <td className="px-2">{cell(i, 'offerPrice', r.offerPrice)}</td>
                <td className="px-2">{cell(i, 'regularPrice', r.regularPrice)}</td>
                <td className="px-2">{cell(i, 'salePrice', r.salePrice)}</td>
                <td className="px-2">{cell(i, 'stock', r.stock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-pn/95 sticky bottom-0 mt-3 flex items-center gap-3 py-2 backdrop-blur">
        <button type="submit" disabled={pending} className={ui.btn}>
          {t('save')}
        </button>
        {state.ok && (
          <span role="status" className="text-ok">
            {t('p.changed', { count: (state.data as { changed: number }).changed })}
          </span>
        )}
        {state.error && (
          <span role="alert" className="text-red-400">
            {t('err.invalid_value')}
          </span>
        )}
      </div>
    </form>
  )
}
