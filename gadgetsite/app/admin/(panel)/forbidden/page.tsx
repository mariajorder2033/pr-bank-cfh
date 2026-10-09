import { getTranslations } from 'next-intl/server'

export default async function Forbidden() {
  const t = await getTranslations('admin')
  return (
    <div className="py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">{t('forbiddenTitle')}</h1>
      <p className="text-mut">{t('forbiddenBody')}</p>
    </div>
  )
}
