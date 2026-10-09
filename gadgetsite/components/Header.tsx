'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { MenuItem, SiteSettings } from '@/lib/content/schemas'
import { text, type Locale } from '@/lib/i18n'
import type { ExploreBrand, MegaMenu } from '@/lib/server/content'
import { ui } from '@/lib/ui'
import { useHydrated } from '@/lib/use-hydrated'
import { cartCount, useCart } from '@/store/cart'
import Brand from './Brand'
import LocaleToggle from './LocaleToggle'
import { useMotion } from './MotionProvider'
import ThemeToggle from './ThemeToggle'

const COLS: Record<MegaMenu['layout'], string> = {
  list: 'grid-cols-1',
  cols2: 'grid-cols-2',
  cols3: 'grid-cols-2 min-[1101px]:grid-cols-3',
  cols6: 'grid-cols-2 min-[1101px]:grid-cols-6',
}
// ≤1100 px panels are full-width sheets (TRD §10).
const PANEL =
  'absolute inset-x-0 top-full z-30 mt-1.5 max-h-[62vh] animate-wipe overflow-auto rounded-xl border border-white/5 bg-[#1c1814]/95 shadow-[0_24px_48px_-12px_#000c] backdrop-blur-md min-[1101px]:right-auto min-[1101px]:max-h-none'

const EXPLORE = '__explore'

type Props = {
  site: SiteSettings
  /** The admin header menu: the menu-row chips, in order. */
  menu: MenuItem[]
  /** Dropdown panels, matched to chips by their `/category/<slug>` link. */
  megaMenus: MegaMenu[]
  exploreBrands: Record<string, ExploreBrand[]>
  /** The signed-in customer, or null. */
  customer: { firstName: string | null } | null
}

export default function Header({ site, menu, megaMenus, exploreBrands, customer }: Props) {
  const t = useTranslations('nav')
  const locale = useLocale() as Locale
  const router = useRouter()
  const motion = useMotion()
  const hydrated = useHydrated()
  const count = useCart((s) => cartCount(s.lines))
  const toggleCart = useCart((s) => s.toggle)

  const [open, setOpen] = useState<string | null>(null)
  const [left, setLeft] = useState(0)
  const [exploreCat, setExploreCat] = useState(megaMenus[0]?.categorySlug ?? '')
  const brandGrid = useRef<HTMLDivElement>(null)

  const mega = megaMenus.find((m) => m.categorySlug === open)
  const wipe = { animationDuration: `${motion.wipeMs}ms` }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (brandGrid.current) brandGrid.current.scrollTop = 0
  }, [exploreCat])

  return (
    <header
      data-testid="site-header"
      className="relative mx-auto w-[min(1240px,calc(100%-24px))] rounded-b-3xl bg-gradient-to-b from-[#0c0a09] to-[#1d1915] pb-3.5 pt-1.5 text-[#f4ede5] min-[701px]:w-[min(1240px,calc(100%-60px))]"
    >
      <div className="px-3 min-[701px]:px-8">
        <div className="flex justify-between gap-3 overflow-x-auto whitespace-nowrap pb-2 pt-1 text-[10px] text-[#cfc6bb] [scrollbar-width:none]">
          <span>
            <Link href="/blogs">{t('blogs')}</Link>
            <Link href="/emi-policy" className="ml-3 text-sand">
              {t('emi')}
            </Link>
          </span>
          {site.phone && <a href={`tel:${site.phone}`}>📞 {site.phone}</a>}
        </div>

        <div className="flex flex-wrap items-center gap-3 min-[1101px]:flex-nowrap min-[1101px]:gap-5">
          <Link
            href="/"
            className="mr-auto font-serif text-3xl font-extrabold tracking-tight text-white min-[1101px]:mr-0"
          >
            <Brand site={site} locale={locale} />
          </Link>
          <nav className="hidden gap-5 text-xs min-[1101px]:flex">
            <Link href="/brands">{t('brand')}</Link>
            <Link href="/online-exclusive">{t('exclusive')}</Link>
            <Link href="/pre-order">{t('preorder')}</Link>
          </nav>
          <form
            role="search"
            className="focus-within:ring-sand/50 order-last min-w-0 flex-[1_1_100%] rounded-[10px] bg-[#2a2521] px-3.5 py-2.5 text-xs text-mut ring-1 ring-transparent transition-[box-shadow,background-color] duration-200 ease-smooth focus-within:bg-[#312b26] min-[1101px]:order-none min-[1101px]:flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
            }}
          >
            ⌕{' '}
            <input
              name="q"
              className="w-4/5 bg-transparent text-xs outline-none"
              placeholder={t('search')}
              aria-label={t('search')}
            />
          </form>
          <Link href="/wishlist" className={ui.iconBox} aria-label={t('wishlist')}>
            ♡
          </Link>
          <Link href="/compare" className={ui.iconBox} aria-label={t('compare')}>
            ⇄
          </Link>
          <Link
            href={customer ? '/account' : '/account/login'}
            data-testid="account-link"
            className={`${ui.iconBox} max-w-[9rem] truncate text-xs`}
            aria-label={t('account')}
          >
            👤{customer?.firstName ? ` ${customer.firstName}` : ''}
          </Link>
          <button
            type="button"
            data-testid="cart-button"
            className={ui.iconBox}
            aria-label={t('cart')}
            onClick={() => toggleCart(true)}
          >
            🛍 <span data-testid="cart-count">{hydrated && count ? count : ''}</span>
          </button>
          <LocaleToggle />
          <ThemeToggle />
        </div>

        <div
          className="relative mt-3 flex items-center gap-2.5"
          onPointerLeave={() => setOpen(null)}
        >
          <button
            type="button"
            data-testid="explore-all"
            onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(EXPLORE)}
            onClick={() => setOpen(open === EXPLORE ? null : EXPLORE)}
            className="whitespace-nowrap rounded-[10px] bg-sand px-[18px] py-[11px] text-[11px] font-semibold tracking-wide text-ink shadow-[0_4px_14px_-6px_#d2a679a0] transition-[filter,transform] duration-200 ease-smooth hover:brightness-105 active:scale-[.97]"
          >
            {t('exploreAll')} <span aria-hidden>&nbsp;⌄</span>
          </button>
          <div
            data-testid="menu-row"
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto rounded-[10px] bg-[#1c1814] p-1.5 [scrollbar-width:none]"
          >
            {menu.map((item) => {
              const panel = megaMenus.find((m) => item.href === `/category/${m.categorySlug}`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group whitespace-nowrap rounded-md bg-[#2c2621] px-3 py-[7px] text-[11px] text-[#e8e0d6] transition-[color,background-color] duration-150 ease-smooth hover:bg-[#3a312a] hover:text-sand"
                  onPointerEnter={(e) => {
                    if (e.pointerType !== 'mouse') return
                    setOpen(panel?.categorySlug ?? null)
                    setLeft(e.currentTarget.offsetLeft)
                  }}
                >
                  {text(item.label, locale)}
                  {panel && (
                    <>
                      {' '}
                      <span
                        aria-hidden
                        className="inline-block transition-transform duration-200 group-hover:rotate-180"
                      >
                        ⌄
                      </span>
                    </>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Keyed by item, so switching items remounts the panel and replays the wipe;
              closing unmounts it at once (no exit animation, TRD §9). */}
          {mega && mega.items.length > 0 && (
            <div
              key={mega.categorySlug}
              data-testid="mega-panel"
              className={`${PANEL} grid min-w-[220px] gap-x-9 gap-y-1.5 px-5 py-3.5 text-xs min-[1101px]:left-[var(--l)] ${COLS[mega.layout]}`}
              style={{ ...wipe, ['--l' as string]: mega.layout === 'cols6' ? '0px' : `${left}px` }}
            >
              {mega.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-1.5 py-1 text-[#e8e0d6] transition-[color,background-color,transform] duration-150 ease-smooth hover:translate-x-0.5 hover:bg-white/5 hover:text-sand"
                  onClick={() => setOpen(null)}
                >
                  {text(item.label, locale)}
                </Link>
              ))}
            </div>
          )}

          {open === EXPLORE && (
            <div data-testid="explore-panel" className={`${PANEL} flex gap-2 p-2`} style={wipe}>
              <div
                data-testid="explore-categories"
                className="max-h-80 w-36 shrink-0 overflow-auto border-r border-pn pr-2 min-[701px]:w-44"
              >
                {megaMenus.map((m) => (
                  <Link
                    key={m.categorySlug}
                    href={`/category/${m.categorySlug}`}
                    onPointerEnter={() => setExploreCat(m.categorySlug)}
                    className={`block rounded-lg px-2.5 py-2 text-[11px] transition-colors duration-150 ease-smooth ${exploreCat === m.categorySlug ? 'bg-[#5e5243]' : 'hover:bg-[#5b4a38]'}`}
                  >
                    {text(m.name, locale)}
                  </Link>
                ))}
              </div>
              <div
                ref={brandGrid}
                data-testid="explore-brands"
                className="grid max-h-80 flex-1 grid-cols-[repeat(auto-fill,minmax(78px,1fr))] content-start gap-2 overflow-auto min-[1101px]:w-[330px]"
              >
                {(exploreBrands[exploreCat] ?? []).map((b) => (
                  <Link
                    key={b.slug}
                    href={`/category/${exploreCat}?brands=${b.slug}`}
                    className="rounded-lg bg-white px-1 py-[18px] text-center text-[11px] font-bold text-ink transition-[transform,box-shadow] duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-8px_#000]"
                  >
                    {text(b.name, locale)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
