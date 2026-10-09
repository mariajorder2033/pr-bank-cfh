'use client'
import { useTranslations } from 'next-intl'
import { useId, type InputHTMLAttributes } from 'react'
import { ui } from '@/lib/ui'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  hint?: string
  errors?: string[]
}

/** Labelled input with its validation message (codes map to account.err.*). */
export default function Field({ label, name, hint, errors, ...input }: Props) {
  const t = useTranslations('account.err')
  const error = errors?.[0]
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="grid gap-1">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        className={ui.input}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...input}
      />
      {hint && !error && (
        <small id={`${id}-hint`} className="text-mut">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="text-red-400">
          {t.has(name) ? t(name) : t(error)}
        </small>
      )}
    </div>
  )
}

export function FormError({ code }: { code?: string }) {
  const t = useTranslations('account.err')
  if (!code) return null
  return (
    <p role="alert" className="rounded-lg bg-[#4a1e1e] p-2.5 text-red-300">
      {t.has(code) ? t(code) : code}
    </p>
  )
}
