'use client'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { ui } from '@/lib/ui'
import { codeStep, passwordStep, type LoginState } from './actions'

export default function LoginForm() {
  const t = useTranslations('admin')
  const [pw, pwAction, pwPending] = useActionState<LoginState, FormData>(passwordStep, {})
  const [code, codeAction, codePending] = useActionState<LoginState, FormData>(codeStep, {})
  const state = code.pendingToken || code.error === 'expired' ? code : pw
  const atCode = !!state.pendingToken && code.error !== 'expired'
  const error = atCode ? code.error : code.error === 'expired' ? 'expired' : pw.error

  return (
    <div className="grid gap-4">
      {error && (
        <p role="alert" className="rounded-lg bg-[#4a1e1e] p-2.5 text-red-300">
          {t(`err.${error}`)}
        </p>
      )}
      {!atCode ? (
        <form action={pwAction} className="grid gap-3">
          <label className="grid gap-1">
            {t('email')}
            <input
              name="email"
              type="email"
              autoComplete="username"
              defaultValue={pw.email}
              required
              className={ui.input}
            />
          </label>
          <label className="grid gap-1">
            {t('password')}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={ui.input}
            />
          </label>
          <button type="submit" className={ui.btn} disabled={pwPending}>
            {t('continue')}
          </button>
        </form>
      ) : (
        <form action={codeAction} className="grid gap-3">
          <input type="hidden" name="pendingToken" value={state.pendingToken} />
          {state.step === 'enrol' && state.enrol && (
            <div className="grid justify-items-center gap-2 text-center">
              <h2 className="text-lg font-semibold">{t('enrolTitle')}</h2>
              <p className="text-mut">{t('enrolHelp')}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.enrol.qr}
                alt=""
                data-testid="totp-qr"
                className="size-[220px] rounded-xl bg-white p-2"
              />
              <code data-testid="totp-secret" className="break-all text-xs text-mut">
                {t('enrolKey', { secret: state.enrol.secret })}
              </code>
            </div>
          )}
          <label className="grid gap-1">
            {t('code')}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              className={ui.input}
            />
          </label>
          <button type="submit" className={ui.btn} disabled={codePending}>
            {t('verify')}
          </button>
        </form>
      )}
    </div>
  )
}
