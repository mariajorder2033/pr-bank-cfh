import { getTranslations } from 'next-intl/server'
import SavedList from '@/components/SavedList'

export default async function ComparePage() {
  const t = await getTranslations('pg')
  return (
    <>
      <h1 className="mb-4 text-[22px] font-semibold">{t('compare')}</h1>
      <SavedList list="cmp" />
    </>
  )
}
