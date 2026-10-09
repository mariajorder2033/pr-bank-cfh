import { getTranslations } from 'next-intl/server'
import PreorderForm from '@/components/PreorderForm'

export default async function PreorderPage() {
  const t = await getTranslations('pg')
  return (
    <>
      <h1 className="text-[22px] font-semibold">{t('preorder')}</h1>
      <p className="mb-4 text-mut">{t('preorderLead')}</p>
      <PreorderForm />
    </>
  )
}
