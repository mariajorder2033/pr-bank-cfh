'use client'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { formatBDT } from '@/lib/domain/money'
import { text, type Locale } from '@/lib/i18n'
import type { ProductCard as Card } from '@/lib/server/catalog'
import { useHydrated } from '@/lib/use-hydrated'
import { useCart } from '@/store/cart'
import { useLists } from '@/store/lists'

const pill = 'absolute top-2.5 z-10 rounded-full px-2.5 py-[3px] text-[11px] text-white'
const roundBtn =
  'grid size-7 place-items-center rounded-full bg-white text-[13px] text-[#555] shadow'

export const canBuy = (s: Card['stockStatus']) => s === 'in_stock' || s === 'few_left'

export default function ProductCard({ p }: { p: Card }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const hydrated = useHydrated()
  const add = useCart((s) => s.add)
  const { wish, cmp, toggle } = useLists()
  const liked = hydrated && wish.includes(p.slug)
  const comparing = hydrated && cmp.includes(p.slug)
  const title = text(p.title, locale)
  const badge = p.badges[0]

  return (
    <div
      data-testid="product-card"
      className="group relative overflow-hidden rounded-2xl bg-[#f4f4f4] p-3 text-ink transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_#0006]"
    >
      {p.discountPercent > 0 && (
        <span className={`${pill} left-2.5 bg-sale`}>-{p.discountPercent}%</span>
      )}
      {badge && (
        <span className={`${pill} right-2.5`} style={{ backgroundColor: badge.color }}>
          {text(badge.label, locale)}
        </span>
      )}
      <Link href={`/products/${p.slug}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={title}
          className="mb-2 h-[140px] w-full rounded-[10px] object-cover transition duration-300 group-hover:scale-105"
        />
      </Link>
      <div className="absolute right-2.5 top-[104px] flex gap-1.5">
        <button
          type="button"
          data-testid="wish-toggle"
          aria-pressed={liked}
          aria-label={t('nav.wishlist')}
          className={`${roundBtn} ${liked ? 'animate-pop !text-[#e0245e]' : ''}`}
          onClick={() => toggle('wish', p.slug)}
        >
          {liked ? '♥' : '♡'}
        </button>
        <button
          type="button"
          aria-pressed={comparing}
          aria-label={t('nav.compare')}
          className={`${roundBtn} ${comparing ? '!text-[#e0245e]' : ''}`}
          onClick={() => toggle('cmp', p.slug)}
        >
          ⇄
        </button>
      </div>
      <Link href={`/products/${p.slug}`} className="block text-[13px]">
        {title}
      </Link>
      <span className={`text-[12px] ${canBuy(p.stockStatus) ? 'text-ok' : 'text-red-600'}`}>
        {t(`stock.${p.stockStatus}`)}
      </span>
      <div>
        <b className="text-base">{formatBDT(p.offerPrice, locale)}</b>{' '}
        {p.regularPrice > p.offerPrice && (
          <s className="text-xs text-[#999]">{formatBDT(p.regularPrice, locale)}</s>
        )}
      </div>
      <button
        type="button"
        disabled={!canBuy(p.stockStatus)}
        className="mt-2 w-full rounded-[10px] border border-[#f0d9bd] p-2 text-center font-medium text-band transition hover:bg-[#fdf1e3] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() =>
          add({
            variantId: p.variantId,
            slug: p.slug,
            title: p.title,
            image: p.image,
            price: p.offerPrice,
          })
        }
      >
        🛍 {t('btn.add')}
      </button>
    </div>
  )
}
