import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { LogoutButton, PasswordForm, ProfileForm } from '@/components/account/AccountForms'
import { db } from '@/lib/db'
import { formatBDT } from '@/lib/domain/money'
import { currentLocale } from '@/lib/server/locale'
import { currentCustomer } from '@/lib/server/session'
import { ui } from '@/lib/ui'

export default async function AccountPage() {
  const customer = await currentCustomer()
  if (!customer) redirect('/account/login')
  const [t, locale, orders] = await Promise.all([
    getTranslations('account'),
    currentLocale(),
    db.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, number: true, grandTotal: true, status: true, createdAt: true },
    }),
  ])
  const when = customer.lastLoginAt?.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka',
  })

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">
            {t('title')}
            {customer.name ? ` · ${customer.name}` : ''}
          </h1>
          <p className="text-mut">
            {customer.phone} ·{' '}
            {customer.phoneVerifiedAt ? t('phoneVerified') : t('phoneUnverified')}
            {when && <> · {t('lastLogin', { when })}</>}
          </p>
        </div>
        <LogoutButton />
      </div>
      <div className="grid gap-5 min-[1101px]:grid-cols-2">
        <section className={ui.panel}>
          <ProfileForm name={customer.name ?? ''} email={customer.email ?? ''} />
        </section>
        <section className={ui.panel}>
          <PasswordForm hasPassword={customer.passwordHash !== null} />
        </section>
      </div>
      <section className={ui.panel}>
        <h2 className="mb-2 text-lg font-semibold">{t('orders')}</h2>
        {orders.length ? (
          <ul className="grid gap-2">
            {orders.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>{t('order', { number: o.number })}</span>
                <b>{formatBDT(o.grandTotal, locale)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-mut">{t('noOrders')}</p>
        )}
      </section>
    </div>
  )
}
