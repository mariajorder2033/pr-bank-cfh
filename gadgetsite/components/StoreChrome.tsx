import type { ReactNode } from 'react'
import CartDrawer from '@/components/CartDrawer'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { MotionProvider } from '@/components/MotionProvider'
import Ribbon from '@/components/Ribbon'
import {
  getExploreBrands,
  getFooterLinks,
  getMegaMenus,
  getMenu,
  getSettings,
  getTicker,
} from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'
import { currentCustomer } from '@/lib/server/session'

/** Storefront header, ribbon, footer and cart around a page (store layout and the 404). */
export default async function StoreChrome({ children }: { children: ReactNode }) {
  const [locale, settings, headerMenu, megaMenus, exploreBrands, ticker, footerLinks, customer] =
    await Promise.all([
      currentLocale(),
      getSettings(),
      getMenu('header'),
      getMegaMenus(),
      getExploreBrands(),
      getTicker(),
      getFooterLinks(),
      currentCustomer(),
    ])
  const firstName = customer?.name?.trim().split(/\s+/)[0] ?? null

  return (
    <MotionProvider value={settings.motion}>
      <Header
        site={settings.site}
        menu={headerMenu}
        megaMenus={megaMenus}
        exploreBrands={exploreBrands}
        customer={customer ? { firstName } : null}
      />
      <Ribbon items={ticker} />
      <main className="mx-auto max-w-[1240px] px-3 pt-[18px] min-[701px]:px-5">{children}</main>
      <Footer site={settings.site} links={footerLinks} locale={locale} />
      <CartDrawer freeOver={settings.delivery.freeOver} />
    </MotionProvider>
  )
}
