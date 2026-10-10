'use client'
import { useActionState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { ActionState } from '@/lib/admin/action'
import { ui } from '@/lib/ui'

/** A small form whose body is server-rendered children (checkbox grids, hidden ids). */
export default function ActionForm({
  action,
  children,
  submitLabel,
  testId,
  ghost,
}: {
  action: (p: ActionState, f: FormData) => Promise<ActionState>
  children: ReactNode
  submitLabel?: string
  testId?: string
  ghost?: boolean
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState(action, {})
  const msg = (c?: string) => (c && t.has(`err.${c}`) ? t(`err.${c}`) : c)
  const field = state.fieldErrors && Object.values(state.fieldErrors)[0]?.[0]
  return (
    <form action={formAction} data-testid={testId} className="grid gap-3">
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={ghost ? ui.btnGhost : ui.btn}>
          {submitLabel ?? t('save')}
        </button>
        {state.ok && (
          <span role="status" className="animate-fi text-ok">
            {t('saved')}
          </span>
        )}
        {(state.error || field) && (
          <span role="alert" className="text-red-400">
            {msg(state.error ?? field)}
          </span>
        )}
      </div>
    </form>
  )
}
