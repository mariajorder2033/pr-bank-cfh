'use client'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  loginCodeAction,
  loginPasswordAction,
  requestCodeAction,
  type FormState,
} from '@/app/(store)/account/actions'
import { ui } from '@/lib/ui'
import Field, { FormError } from './Field'

const tab = (on: boolean) =>
  `flex-1 rounded-lg px-3 py-2 text-center ${on ? 'bg-sand font-semibold text-ink' : 'bg-pn'}`

/** Password login, plus SMS-code login when an SMS gateway is configured. */
export default function LoginForm({ smsEnabled, next }: { smsEnabled: boolean; next?: string }) {
  const t = useTranslations('account')
  const [mode, setMode] = useState<'password' | 'sms'>('password')
  const [pw, pwAction, pwPending] = useActionState<FormState, FormData>(loginPasswordAction, {})
  const [req, reqAction, reqPending] = useActionState<FormState, FormData>(requestCodeAction, {})
  const [code, codeAction, codePending] = useActionState<FormState, FormData>(loginCodeAction, {})
  const [editing, setEditing] = useState(false)
  // The number the latest code went to; editing goes back to the number form.
  const codePhone = editing ? undefined : (req.phone ?? code.phone)
  const nextField = <input type="hidden" name="next" value={next ?? ''} />

  return (
    <div className="grid gap-4">
      {smsEnabled && (
        <div role="tablist" className="flex gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'password'}
            className={tab(mode === 'password')}
            onClick={() => setMode('password')}
          >
            {t('tabPassword')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sms'}
            className={tab(mode === 'sms')}
            onClick={() => setMode('sms')}
          >
            {t('tabSms')}
          </button>
        </div>
      )}

      {mode === 'password' ? (
        <form action={pwAction} className="grid gap-3" noValidate>
          {nextField}
          <FormError code={pw.error} />
          <Field
            label={t('phone')}
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={pw.values?.phone}
          />
          <Field
            label={t('password')}
            name="password"
            type="password"
            autoComplete="current-password"
          />
          <button type="submit" className={ui.btn} disabled={pwPending}>
            {t('login')}
          </button>
        </form>
      ) : codePhone ? (
        <form action={codeAction} className="grid gap-3" noValidate>
          {nextField}
          <input type="hidden" name="phone" value={codePhone} />
          <p className="text-mut">{t('codeSent', { phone: codePhone })}</p>
          <FormError code={code.error} />
          <Field
            label={t('code')}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <button type="submit" className={ui.btn} disabled={codePending}>
            {t('loginWithCode')}
          </button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button
              type="submit"
              formAction={reqAction}
              formNoValidate
              className="text-sand underline-offset-4 hover:underline"
              disabled={reqPending}
            >
              {t('resend')}
            </button>
            <button
              type="button"
              className="text-mut underline-offset-4 hover:underline"
              onClick={() => setEditing(true)}
            >
              {t('changeNumber')}
            </button>
          </div>
        </form>
      ) : (
        <form
          action={reqAction}
          onSubmit={() => setEditing(false)}
          className="grid gap-3"
          noValidate
        >
          <FormError code={req.error} />
          <Field
            label={t('phone')}
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            hint={t('phoneHint')}
            defaultValue={req.values?.phone}
            errors={req.fieldErrors?.phone}
          />
          <button type="submit" className={ui.btn} disabled={reqPending}>
            {t('sendCode')}
          </button>
        </form>
      )}

      <p className="text-mut">
        {t('noAccount')}{' '}
        <Link
          className="text-sand"
          href={next ? `/account/signup?next=${encodeURIComponent(next)}` : '/account/signup'}
        >
          {t('signup')}
        </Link>
      </p>
    </div>
  )
}
