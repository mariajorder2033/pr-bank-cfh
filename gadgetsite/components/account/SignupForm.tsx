'use client'
import Link from 'next/link'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { signUpAction, type FormState } from '@/app/(store)/account/actions'
import { ui } from '@/lib/ui'
import Field, { FormError } from './Field'

export default function SignupForm({ next }: { next?: string }) {
  const t = useTranslations('account')
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, {})
  return (
    <form action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <FormError code={state.error} />
      <Field
        label={t('name')}
        name="name"
        autoComplete="name"
        defaultValue={state.values?.name}
        errors={state.fieldErrors?.name}
      />
      <Field
        label={t('phone')}
        name="phone"
        inputMode="tel"
        autoComplete="tel"
        hint={t('phoneHint')}
        defaultValue={state.values?.phone}
        errors={state.fieldErrors?.phone}
      />
      <Field
        label={t('password')}
        name="password"
        type="password"
        autoComplete="new-password"
        hint={t('passwordHint')}
        errors={state.fieldErrors?.password}
      />
      <button type="submit" className={ui.btn} disabled={pending}>
        {t('signup')}
      </button>
      <p className="text-mut">
        {t('haveAccount')}{' '}
        <Link
          className="text-sand"
          href={next ? `/account/login?next=${encodeURIComponent(next)}` : '/account/login'}
        >
          {t('login')}
        </Link>
      </p>
    </form>
  )
}
