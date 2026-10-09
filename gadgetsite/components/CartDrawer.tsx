'use client'
import { useLocale, useTranslations } from 'next-intl'
import { formatBDT } from '@/lib/domain/money'
import { text, type Locale } from '@/lib/i18n'
import { ui } from '@/lib/ui'
import { useHydrated } from '@/lib/use-hydrated'
import { cartSubtotal, useCart } from '@/store/cart'

/** Cart lines and subtotal. Checkout arrives in Stage 5. */
export default function CartDrawer({ freeOver }: { freeOver: number }) {
  const t = useTranslations('cart')
  const locale = useLocale() as Locale
  const hydrated = useHydrated()
  const { lines, open, toggle, setQty, remove } = useCart()
  const shown = hydrated ? lines : []
  const sum = cartSubtotal(shown)

  return (
    <>
      <div
        className={`fixed inset-0 z-[59] bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => toggle(false)}
      />
      <aside
        data-testid="cart-drawer"
        aria-hidden={!open}
        className={`fixed bottom-0 right-0 top-0 z-[60] flex w-[min(420px,100%)] flex-col bg-[#272320] p-4 text-[#f4ede5] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.22,.8,.2,1)] ${open ? 'translate-x-0' : 'invisible translate-x-[105%]'}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-semibold">{t('title')}</h2>
          <button type="button" className={ui.seeAll} onClick={() => toggle(false)}>
            {t('close')}
          </button>
        </div>
        {freeOver > 0 && (
          <>
            <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-[#3a332c]">
              <i
                className="block h-full bg-sand transition-all duration-500"
                style={{ width: `${Math.min(100, (sum / freeOver) * 100)}%` }}
              />
            </div>
            <small className="text-mut">
              {sum >= freeOver
                ? t('free')
                : t('more', { amount: formatBDT(freeOver - sum, locale) })}
            </small>
          </>
        )}

        <div className="my-3 flex-1 overflow-auto">
          {shown.map((l) => (
            <div
              key={l.variantId}
              className="mb-2 flex animate-fi items-center gap-2.5 rounded-xl bg-[#1c1814] p-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image} alt="" className="size-[54px] rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate">{text(l.title, locale)}</div>
                <b>{formatBDT(l.price, locale)}</b>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="w-6 rounded-md bg-pn text-center"
                  onClick={() => setQty(l.variantId, l.qty - 1)}
                >
                  −
                </button>
                {l.qty}
                <button
                  type="button"
                  className="w-6 rounded-md bg-pn text-center"
                  onClick={() => setQty(l.variantId, l.qty + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-1 text-mut"
                  aria-label={t('remove')}
                  onClick={() => remove(l.variantId)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {!shown.length && <p className="mt-10 text-center text-mut">{t('empty')}</p>}
        </div>

        <div className={ui.total}>
          <span>{t('subtotal')}</span>
          <span>{formatBDT(sum, locale)}</span>
        </div>
      </aside>
    </>
  )
}
