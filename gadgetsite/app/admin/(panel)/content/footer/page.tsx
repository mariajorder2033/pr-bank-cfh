import { getTranslations } from 'next-intl/server'
import FooterEditor from '@/components/admin/FooterEditor'
import PageHeader from '@/components/admin/PageHeader'
import { requirePage } from '@/lib/admin/guard'
import { defaultFooter } from '@/lib/content/defaults'
import { FooterSettings, parseSetting } from '@/lib/content/schemas'
import { db } from '@/lib/db'
import { saveFooter } from './actions'

export default async function FooterPage() {
  await requirePage('content.write')
  const t = await getTranslations('admin.footer')
  // The raw stored footer (including links to pages not published yet).
  const row = await db.setting.findUnique({ where: { key: 'footer' } })
  const footer = parseSetting(FooterSettings, row?.value, defaultFooter)
  return (
    <>
      <PageHeader title={t('title')} />
      <p className="mb-4 max-w-2xl text-mut">{t('intro')}</p>
      <FooterEditor action={saveFooter} footer={footer} />
    </>
  )
}
