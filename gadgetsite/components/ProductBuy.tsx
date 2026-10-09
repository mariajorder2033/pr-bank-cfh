'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { emiOptions } from '@/lib/domain/emi'
import { formatBDT } from '@/lib/domain/money'
import { optionValues, pickVariant, type Dimension } from '@/lib/domain/variants'
import { text, type Locale } from '@/lib/i18n'
import type { ProductDetail } from '@/lib/server/catalog'
import { ui } from '@/lib/ui'
import { useCart } from '@/store/cart'
import { canBuy } from './ProductCard'

const LABEL: Record<Dimension, 'color' | 'storage' | 'ram' | 'region'> = {
  color: 'color',
  storage: 'storage',
  ram: 'ram',
  region: 'region',
}

export default function ProductBuy({ p }: { p: ProductDetail }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const add = useCart((s) => s.add)
  const [variant, setVariant] = useState(
    () => p.variants.find((v) => v.id === p.variantId) ?? p.variants[0],
  )
  const [qty, setQty] = useState(1)
  const options = optionValues(p.variants)
  const buyable = canBuy(variant.stockStatus)

  // EMI follows the selected variant's price; rates come from admin only.
  const emi = p.emi
    .map((bank) => ({ bank, options: emiOptions(variant.offerPrice, bank.rates, bank.minAmount) }))
    .filter((b) => b.options.length)
  const lowestMonthly = emi.length
    ? Math.min(...emi.flatMap((b) => b.options.map((o) => o.monthly)))
    : null

  return (
    <div className="min-w-0">
      <h1 className="text-[22px] font-semibold">{text(p.title, locale)}</h1>
      <p>
        {t('pd.by')}: <span className="text-sand">{text(p.brand.name, locale)}</span>
      </p>

      {p.preorder && p.bookingAmount !== null && !buyable ? (
        <div className="my-2 rounded-lg bg-[#3d3120] p-2.5 text-sand">
          {t('pd.booking', { amount: formatBDT(p.bookingAmount, locale) })}
          <br />
          <small className="text-mut">{t('pd.bookingNote')}</small>
        </div>
      ) : (
        !buyable && (
          <div className="my-2 rounded-lg bg-[#4a1e1e] p-2.5 text-red-400">
            {t('pd.unavailable')}
          </div>
        )
      )}

      {Object.keys(options).length > 0 && (
        <div className={`${ui.panel} my-3`}>
          {(Object.entries(options) as [Dimension, string[]][]).map(([dim, values]) => (
            <div key={dim} className="mb-2">
              <b>{t(`pd.${LABEL[dim]}`)}</b>
              <div>
                {values.map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={variant[dim] === value}
                    onClick={() => setVariant(pickVariant(p.variants, variant, dim, value))}
                    className={`m-1 inline-block rounded-lg border px-3 py-1.5 text-ink transition ${variant[dim] === value ? 'border-2 border-[#d2893a] bg-[#fff3e2]' : 'border-[#6d6154] bg-[#f4f4f4]'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3.5 min-[701px]:grid-cols-2">
        <div className="rounded-2xl border border-sand bg-[#f4f4f4] p-3 text-ink">
          {t('pd.offer')} <b data-testid="offer-price">{formatBDT(variant.offerPrice, locale)}</b>
          {variant.discountPercent > 0 && (
            <span className="ml-2 rounded-full bg-sale px-2 py-0.5 text-[11px] text-white">
              -{variant.discountPercent}%
            </span>
          )}
          <br />
          <small>{t('pd.offerNote')}</small>
        </div>
        <div className="rounded-2xl bg-[#f4f4f4] p-3 text-ink">
          {t('pd.regular')} <b>{formatBDT(variant.regularPrice, locale)}</b>
          {lowestMonthly !== null && (
            <>
              <br />
              <small>{t('pd.emiFrom', { amount: formatBDT(lowestMonthly, locale) })}</small>
            </>
          )}
        </div>
      </div>

      <div className="my-3.5 flex flex-wrap items-center gap-2.5">
        <span className="rounded-[10px] bg-white px-2 py-1.5 text-ink" aria-label={t('pd.qty')}>
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>
            −
          </button>{' '}
          {qty}{' '}
          <button
            type="button"
            onClick={() => setQty(Math.max(1, Math.min(variant.available, qty + 1)))}
          >
            +
          </button>
        </span>
        <button
          type="button"
          data-testid="add-to-cart"
          className={ui.btn}
          disabled={!buyable}
          onClick={() =>
            add(
              {
                variantId: variant.id,
                slug: p.slug,
                title: p.title,
                image: variant.images[0] ?? p.image,
                price: variant.offerPrice,
              },
              qty,
            )
          }
        >
          🛍 {t('btn.add')}
        </button>
        <span className={buyable ? 'text-ok' : 'text-mut'}>
          {t(`stock.${variant.stockStatus}`)}
        </span>
      </div>

      {emi.length > 0 && (
        <div className={`${ui.panel} my-3 overflow-x-auto`}>
          <b>{t('pd.emiTitle')}</b>
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr className="text-mut">
                <th className="py-1">{t('pg.emiBank')}</th>
                <th>{t('pd.emiMonthly')}</th>
                <th>{t('pd.emiTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {emi.flatMap(({ bank, options: opts }) =>
                opts.map((o) => (
                  <tr key={`${bank.bank.en}-${o.tenureMonths}`}>
                    <td className="py-1">
                      {text(bank.bank, locale)} · {t('pd.emiTenure', { months: o.tenureMonths })}
                    </td>
                    <td>{formatBDT(o.monthly, locale)}</td>
                    <td>{formatBDT(o.total, locale)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}

      {p.warranty.en && (
        <p className="my-2">
          <b>{t('pd.warranty')}:</b> {text(p.warranty, locale)}
        </p>
      )}
      {p.carePlans.length > 0 && (
        <div className={`${ui.panel} my-3`}>
          <b>{t('pd.carePlans')}</b>
          {p.carePlans.map((c) => (
            <p key={c.id} className="mt-1">
              {text(c.name, locale)} — {formatBDT(c.price, locale)} ·{' '}
              {t('pd.carePlanMonths', { months: c.coverageMonths })}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
