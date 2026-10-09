'use client'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import {
  changePasswordAction,
  logoutAction,
  saveProfileAction,
  type FormState,
} from '@/app/(store)/account/actions'
import { ui } from '@/lib/ui'
import Field, { FormError } from './Field'

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const t = useTranslations('account')
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfileAction, {})
  return (
    <form action={action} className="grid gap-3" noValidate>
      <h2 className="text-lg font-semibold">{t('profile')}</h2>
      <Field
        label={t('name')}
        name="name"
        defaultValue={state.values?.name ?? name}
        errors={state.fieldErrors?.name}
      />
      <Field
        label={t('email')}
        name="email"
        type="email"
        defaultValue={state.values?.email ?? email}
        errors={state.fieldErrors?.email}
      />
      {state.ok && <p className="text-ok">{t('saved')}</p>}
      <button type="submit" className={ui.btn} disabled={pending}>
        {t('save')}
      </button>
    </form>
  )
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations('account')
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {})
  return (
    <form action={action} className="grid gap-3" noValidate>
      <h2 className="text-lg font-semibold">
        {hasPassword ? t('changePassword') : t('setPassword')}
      </h2>
      <FormError code={state.error} />
      {hasPassword && (
        <Field
          label={t('currentPassword')}
          name="current"
          type="password"
          autoComplete="current-password"
        />
      )}
      <Field
        label={t('newPassword')}
        name="password"
        type="password"
        autoComplete="new-password"
        hint={t('passwordHint')}
        errors={state.fieldErrors?.password}
      />
      {state.ok && <p className="text-ok">{t('passwordChanged')}</p>}
      <button type="submit" className={ui.btn} disabled={pending}>
        {t('save')}
      </button>
    </form>
  )
}

export function LogoutButton() {
  const t = useTranslations('account')
  return (
    <form action={logoutAction}>
      <button type="submit" className={ui.btnGhost}>
        {t('logout')}
      </button>
    </form>
  )
}
