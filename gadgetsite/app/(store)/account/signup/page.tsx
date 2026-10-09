import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import SignupForm from '@/components/account/SignupForm'
import { safeNext } from '@/lib/server/request'
import { currentCustomer } from '@/lib/server/session'
import { ui } from '@/lib/ui'

type Props = { searchParams: Promise<{ next?: string }> }

export default async function SignupPage({ searchParams }: Props) {
  const { next } = await searchParams
  if (await currentCustomer()) redirect(safeNext(next))
  const t = await getTranslations('account')
  return (
    <section className={`${ui.panel} mx-auto my-8 grid max-w-md gap-4`}>
      <h1 className="text-[22px] font-semibold">{t('signup')}</h1>
      <SignupForm next={next ? safeNext(next) : undefined} />
    </section>
  )
}
