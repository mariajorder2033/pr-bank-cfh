import { getTranslations } from 'next-intl/server'
import CmsBody from '@/components/CmsBody'
import { formatBDT } from '@/lib/domain/money'
import { text } from '@/lib/i18n'
import { getPage, listEmiBanks } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'
import { ui } from '@/lib/ui'

export default async function EmiPolicyPage() {
  const [page, banks, locale, t] = await Promise.all([
    getPage('emi-policy'),
    listEmiBanks(),
    currentLocale(),
    getTranslations(),
  ])
  const withRates = banks.filter((b) => b.rates.length)
  return (
    <>
      <h1 className="mb-4 text-[22px] font-semibold">
        {page ? text(page.title, locale) : t('pg.emi')}
      </h1>
      {page && <CmsBody html={page.bodyHtml} locale={locale} />}
      {withRates.length ? (
        <div className={`${ui.panel} mt-4 overflow-x-auto`}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-mut">
                <th className="py-1">{t('pg.emiBank')}</th>
                <th>{t('pg.emiMin')}</th>
                {withRates[0] &&
                  [...new Set(withRates.flatMap((b) => b.rates.map((r) => r.tenureMonths)))]
                    .sort((a, b) => a - b)
                    .map((m) => <th key={m}>{t('pd.emiTenure', { months: m })}</th>)}
              </tr>
            </thead>
            <tbody>
              {withRates.map((b) => {
                const tenures = [
                  ...new Set(withRates.flatMap((x) => x.rates.map((r) => r.tenureMonths))),
                ].sort((a, c) => a - c)
                return (
                  <tr key={b.bank.en}>
                    <td className="py-1">{text(b.bank, locale)}</td>
                    <td>{formatBDT(b.minAmount, locale)}</td>
                    {tenures.map((m) => {
                      const rate = b.rates.find((r) => r.tenureMonths === m)
                      return <td key={m}>{rate ? `${rate.percent}%` : '—'}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !page && <p className="py-16 text-center text-mut">{t('pg.none')}</p>
      )}
    </>
  )
}
