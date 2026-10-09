import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import LoginForm from '@/components/account/LoginForm'
import { getSms } from '@/lib/integrations/sms'
import { safeNext } from '@/lib/server/request'
import { currentCustomer } from '@/lib/server/session'
import { ui } from '@/lib/ui'

type Props = { searchParams: Promise<{ next?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams
  if (await currentCustomer()) redirect(safeNext(next))
  const t = await getTranslations('account')
  return (
    <section className={`${ui.panel} mx-auto my-8 grid max-w-md gap-4`}>
      <h1 className="text-[22px] font-semibold">{t('login')}</h1>
      <LoginForm smsEnabled={(await getSms()) !== null} next={next ? safeNext(next) : undefined} />
    </section>
  )
}
