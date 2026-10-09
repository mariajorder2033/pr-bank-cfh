'use client'
import { useActionState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { ActionState } from '@/lib/admin/action'
import { ui } from '@/lib/ui'

export type FieldSpec = {
  name: string
  label: string
  type?:
    | 'text'
    | 'number'
    | 'textarea'
    | 'checkbox'
    | 'select'
    | 'color'
    | 'datetime-local'
    | 'email'
    | 'password'
    | 'url'
  options?: { value: string; label: string }[]
  hint?: string
  required?: boolean
  placeholder?: string
  /** Wide fields span both columns. */
  wide?: boolean
}

type Props = {
  action: (prev: ActionState, f: FormData) => Promise<ActionState>
  fields: FieldSpec[]
  values?: Record<string, string | number | boolean | null | undefined>
  hidden?: Record<string, string>
  submitLabel?: string
  testId?: string
  children?: ReactNode
  danger?: boolean
}

/** A server-action form with per-field errors, used by every simple admin screen. */
export default function AdminForm({
  action,
  fields,
  values = {},
  hidden,
  submitLabel,
  testId,
  children,
  danger,
}: Props) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState(action, {})
  const err = (name: string) => state.fieldErrors?.[name]?.[0]
  const message = (code?: string) => (code && t.has(`err.${code}`) ? t(`err.${code}`) : code)

  return (
    <form action={formAction} data-testid={testId} className="grid gap-3 min-[701px]:grid-cols-2">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => {
        const id = `${testId ?? 'f'}-${f.name}`
        const value = values[f.name]
        const common = {
          id,
          name: f.name,
          required: f.required,
          placeholder: f.placeholder,
          'aria-invalid': !!err(f.name),
        }
        return (
          <div
            key={f.name}
            className={`grid gap-1 ${f.wide || f.type === 'textarea' ? 'min-[701px]:col-span-2' : ''}`}
          >
            {f.type === 'checkbox' ? (
              <label htmlFor={id} className="flex items-center gap-2">
                <input
                  {...common}
                  type="checkbox"
                  value="on"
                  defaultChecked={!!value}
                  className="size-4 accent-[var(--sand)]"
                />
                {f.label}
              </label>
            ) : (
              <>
                <label htmlFor={id} className="text-[13px] text-[#e8e0d6]">
                  {f.label}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    {...common}
                    rows={6}
                    defaultValue={value?.toString() ?? ''}
                    className={`${ui.input} font-mono text-xs`}
                  />
                ) : f.type === 'select' ? (
                  <select {...common} defaultValue={value?.toString() ?? ''} className={ui.input}>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    {...common}
                    type={f.type ?? 'text'}
                    defaultValue={value?.toString() ?? ''}
                    className={
                      f.type === 'color'
                        ? 'h-11 w-full cursor-pointer rounded-lg border border-[#3d352d] bg-[#14181b] p-1'
                        : ui.input
                    }
                  />
                )}
              </>
            )}
            {f.hint && !err(f.name) && <small className="text-mut">{f.hint}</small>}
            {err(f.name) && (
              <small className="text-red-400">
                {message(err(f.name)) ?? t('err.invalid_value')}
              </small>
            )}
          </div>
        )
      })}
      {children}
      <div className="flex flex-wrap items-center gap-3 min-[701px]:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className={danger ? `${ui.btnGhost} !bg-[#5a1e1e]` : ui.btn}
        >
          {submitLabel ?? t('save')}
        </button>
        {state.ok && (
          <span role="status" className="animate-fi text-ok">
            {t('saved')}
          </span>
        )}
        {state.error && (
          <span role="alert" className="text-red-400">
            {message(state.error)}
          </span>
        )}
      </div>
    </form>
  )
}
