'use client'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { formatBDT } from '@/lib/domain/money'
import { text, type Locale } from '@/lib/i18n'
import type { ProductCard as Card } from '@/lib/server/catalog'
import { useHydrated } from '@/lib/use-hydrated'
import { useCart } from '@/store/cart'
import { useLists } from '@/store/lists'

const pill =
  'absolute top-2.5 z-10 rounded-full px-2.5 py-[3px] text-[11px] font-medium text-white shadow-sm'
const roundBtn =
  'grid size-8 place-items-center rounded-full bg-white/95 text-[13px] text-[#555] shadow-md backdrop-blur transition-[transform,color] duration-200 ease-smooth hover:scale-110 active:scale-95'

export const canBuy = (s: Card['stockStatus']) => s === 'in_stock' || s === 'few_left'

/** `index` staggers the entrance animation of cards in a grid (capped, so long grids stay quick). */
export default function ProductCard({ p, index = 0 }: { p: Card; index?: number }) {
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
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="group relative flex animate-rise flex-col overflow-hidden rounded-2xl bg-[#f6f5f3] p-3 text-ink shadow-[0_1px_2px_#0003] transition-[transform,box-shadow] duration-300 ease-smooth hover:-translate-y-1 hover:shadow-[0_14px_30px_-10px_#000a]"
    >
      {p.discountPercent > 0 && (
        <span className={`${pill} left-2.5 bg-sale`}>-{p.discountPercent}%</span>
      )}
      {p.onSale ? (
        <span className={`${pill} right-2.5 bg-[#e0242e]`}>{t('pd.sale')}</span>
      ) : (
        badge && (
          <span className={`${pill} right-2.5`} style={{ backgroundColor: badge.color }}>
            {text(badge.label, locale)}
          </span>
        )
      )}
      <div className="relative mb-2.5 aspect-square overflow-hidden rounded-xl bg-white">
        <Link href={`/products/${p.slug}`} className="block size-full" tabIndex={-1}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="size-full object-contain p-3 transition-transform duration-500 ease-smooth group-hover:scale-[1.06]"
          />
        </Link>
        <div className="absolute bottom-2 right-2 flex gap-1.5">
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
      </div>
      <Link
        href={`/products/${p.slug}`}
        className="line-clamp-2 min-h-[2.5em] text-[13px] leading-snug transition-colors hover:text-[#8a5a2b]"
      >
        {title}
      </Link>
      <span className={`text-[12px] ${canBuy(p.stockStatus) ? 'text-ok' : 'text-red-600'}`}>
        {t(`stock.${p.stockStatus}`)}
      </span>
      <div className="mt-auto pt-1">
        <b className="text-base">{formatBDT(p.offerPrice, locale)}</b>{' '}
        {p.regularPrice > p.offerPrice && (
          <s className="text-xs text-[#999]">{formatBDT(p.regularPrice, locale)}</s>
        )}
      </div>
      <button
        type="button"
        disabled={!canBuy(p.stockStatus)}
        className="mt-2 w-full rounded-[10px] border border-[#f0d9bd] bg-white p-2 text-center font-medium text-band transition-[background-color,transform,border-color] duration-200 ease-smooth hover:border-[#e6c49c] hover:bg-[#fdf1e3] active:scale-[.98] disabled:pointer-events-none disabled:opacity-40"
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
