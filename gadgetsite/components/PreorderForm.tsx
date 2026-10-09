'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BD_MOBILE } from '@/lib/domain/phone'
import { ui } from '@/lib/ui'

type Errors = Partial<Record<'phone' | 'productText' | 'form', string>>

export default function PreorderForm() {
  const t = useTranslations('pg')
  const tb = useTranslations('btn')
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (sent) return <p className="rounded-xl bg-[#1d3a26] p-4 text-[#9be3b0]">{t('sent')}</p>

  return (
    <form
      noValidate
      className="grid max-w-xl gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const body = {
          name: String(f.get('name') ?? '').trim() || undefined,
          phone: String(f.get('phone') ?? '').trim(),
          productText: String(f.get('productText') ?? '').trim(),
        }
        const next: Errors = {}
        if (!BD_MOBILE.test(body.phone)) next.phone = t('phoneInvalid')
        if (body.productText.length < 3 || body.productText.length > 500)
          next.productText = t('productInvalid')
        setErrors(next)
        if (Object.keys(next).length) return
        setBusy(true)
        try {
          const res = await fetch('/api/preorder-requests', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (res.ok) setSent(true)
          else setErrors({ form: t('error') })
        } catch {
          setErrors({ form: t('error') })
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="grid gap-1">
        {t('name')}
        <input name="name" maxLength={80} className={ui.input} autoComplete="name" />
      </label>
      <label className="grid gap-1">
        {t('phone')}
        <input
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          className={ui.input}
          aria-invalid={!!errors.phone}
        />
        {errors.phone && <small className="text-red-400">{errors.phone}</small>}
      </label>
      <label className="grid gap-1">
        {t('product')}
        <textarea
          name="productText"
          maxLength={500}
          rows={3}
          className={ui.input}
          aria-invalid={!!errors.productText}
        />
        {errors.productText && <small className="text-red-400">{errors.productText}</small>}
      </label>
      {errors.form && <p className="text-red-400">{errors.form}</p>}
      <button type="submit" className={ui.btn} disabled={busy}>
        {tb('submit')}
      </button>
    </form>
  )
}
