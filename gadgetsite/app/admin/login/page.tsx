import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentAdmin } from '@/lib/admin/guard'
import { ui } from '@/lib/ui'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect('/admin')
  const t = await getTranslations('admin')
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <section className={`${ui.panel} grid w-full max-w-sm animate-rise gap-4`}>
        <h1 className="text-[22px] font-semibold">{t('signIn')}</h1>
        <LoginForm />
      </section>
    </main>
  )
}
