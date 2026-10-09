import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ui } from '@/lib/ui'

export default async function NotFound() {
  const t = await getTranslations('pg')
  return (
    <div className="py-24 text-center">
      <h1 className="mb-6 text-[28px] font-semibold">{t('notFound')}</h1>
      <Link href="/" className={ui.btn}>
        {t('backHome')}
      </Link>
    </div>
  )
}
