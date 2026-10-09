import { getTranslations } from 'next-intl/server'
import AdminForm from '@/components/admin/AdminForm'
import PageHeader, { Card } from '@/components/admin/PageHeader'
import { requirePage } from '@/lib/admin/guard'
import { describeCredential } from '@/lib/server/credentials'
import { saveServiceSms, sendTestSms } from '../actions'

export default async function ServicesPage() {
  await requirePage('settings.write')
  const [t, sms] = await Promise.all([getTranslations('admin.services'), describeCredential('sms')])
  return (
    <>
      <PageHeader title={t('title')} />
      <p className="mb-4 max-w-2xl text-mut">{t('intro')}</p>
      <Card title={t('sms')}>
        <p className="mb-3 text-[13px] text-mut">
          {sms
            ? t('current', { key: sms.config.apiKey, sender: sms.config.senderId })
            : t('notSet')}
        </p>
        <AdminForm
          testId="sms-form"
          action={saveServiceSms}
          values={{ provider: sms?.provider ?? 'bulksmsbd', enabled: sms?.enabled ?? false }}
          fields={[
            {
              name: 'provider',
              label: t('provider'),
              type: 'select',
              options: [{ value: 'bulksmsbd', label: 'BulkSMSBD' }],
            },
            {
              name: 'apiKey',
              label: t('apiKey'),
              type: 'password',
              hint: sms ? t('keepBlank') : undefined,
            },
            { name: 'senderId', label: t('senderId'), required: true },
            { name: 'enabled', label: t('enabled'), type: 'checkbox' },
          ]}
        />
      </Card>
      <Card title={t('test')}>
        <AdminForm
          testId="sms-test-form"
          action={sendTestSms}
          submitLabel={t('sendTest')}
          fields={[{ name: 'phone', label: t('testPhone'), placeholder: '01XXXXXXXXX' }]}
        />
      </Card>
      <Card title={t('later')}>
        <p className="text-mut">{t('laterBody')}</p>
      </Card>
    </>
  )
}
