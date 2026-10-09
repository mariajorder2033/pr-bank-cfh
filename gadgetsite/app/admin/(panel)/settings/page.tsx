import { getTranslations } from 'next-intl/server'
import AdminForm from '@/components/admin/AdminForm'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import { requirePage } from '@/lib/admin/guard'
import { getSettings } from '@/lib/server/content'
import { saveDelivery, saveMotion, saveSite, saveTheme } from './actions'

export default async function SettingsPage() {
  await requirePage('settings.write')
  const [t, s] = await Promise.all([getTranslations('admin.settings'), getSettings()])
  return (
    <>
      <PageHeader title={t('title')} />
      <Card title={t('site')}>
        <AdminForm
          testId="site-form"
          action={saveSite}
          values={{ ...s.site }}
          fields={[
            { name: 'nameEn', label: t('nameEn'), required: true },
            { name: 'nameBn', label: t('nameBn') },
            { name: 'phone', label: t('phone'), placeholder: '01XXXXXXXXX' },
            { name: 'logoUrl', label: t('logoUrl'), hint: t('logoHint') },
          ]}
        />
      </Card>
      <Card title={t('theme')}>
        <AdminForm
          testId="theme-form"
          action={saveTheme}
          values={{ ...s.theme }}
          fields={Object.keys(s.theme).map((k) => ({ name: k, label: k, type: 'color' as const }))}
        />
      </Card>
      <Card title={t('motion')}>
        <AdminForm
          testId="motion-form"
          action={saveMotion}
          values={{ ...s.motion }}
          fields={[
            { name: 'heroCycleMs', label: t('heroCycleMs'), type: 'number' },
            { name: 'heroSlideMs', label: t('heroSlideMs'), type: 'number' },
            { name: 'heroEasing', label: t('heroEasing') },
            { name: 'tickerPxPerS', label: t('tickerPxPerS'), type: 'number' },
            { name: 'wipeMs', label: t('wipeMs'), type: 'number' },
            { name: 'tileFadeMs', label: t('tileFadeMs'), type: 'number' },
          ]}
        />
      </Card>
      <Card title={t('delivery')}>
        <AdminForm
          testId="delivery-form"
          action={saveDelivery}
          values={{ ...s.delivery }}
          fields={[{ name: 'freeOver', label: t('freeOver'), type: 'number' }]}
        />
      </Card>
    </>
  )
}
