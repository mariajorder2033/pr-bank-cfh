'use client'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import type { ActionState } from '@/lib/admin/action'

/** A delete form that asks first and shows why a delete was refused (e.g. still in use). */
export default function DeleteButton({
  action,
  id,
  label,
}: {
  action: (p: ActionState, f: FormData) => Promise<ActionState>
  id: string
  label?: string
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState(action, {})
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(t('confirmDelete'))) e.preventDefault()
      }}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md px-2 py-1 text-red-300 transition-colors hover:bg-red-500/10"
      >
        {label ?? t('delete')}
      </button>
      {state.error && (
        <small role="alert" className="text-red-400">
          {t(`err.${state.error}`)}
        </small>
      )}
    </form>
  )
}
