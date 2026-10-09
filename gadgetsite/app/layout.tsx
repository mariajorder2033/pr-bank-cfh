import '@fontsource-variable/outfit'
import '@fontsource/noto-sans-bengali/400.css'
import '@fontsource/noto-sans-bengali/600.css'
import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import CartDrawer from '@/components/CartDrawer'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { MotionProvider } from '@/components/MotionProvider'
import Ribbon from '@/components/Ribbon'
import type { ThemeSettings } from '@/lib/content/schemas'
import type { Locale } from '@/lib/i18n'
import { loc } from '@/lib/i18n'
import {
  getExploreBrands,
  getMegaMenus,
  getFooterLinks,
  getSettings,
  getTicker,
} from '@/lib/server/cached'

// Every page reads admin-managed data; caching comes from the tagged data cache.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const [{ site }, locale] = await Promise.all([getSettings(), getLocale()])
  return { title: loc(site, 'name', locale as Locale) }
}

// Saved light/dark choice, applied before paint.
const NO_FLASH =
  "try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}"

/** Admin theme tokens for the default (dark) theme; the light theme keeps its own palette. */
function themeCss(theme: ThemeSettings): string {
  return `:root:not(.light){--bg:${theme.bg};--pn:${theme.panel};--sand:${theme.sand};--sale:${theme.sale};--ok:${theme.success}}`
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale
  const [messages, settings, megaMenus, exploreBrands, ticker, footerLinks] = await Promise.all([
    getMessages(),
    getSettings(),
    getMegaMenus(),
    getExploreBrands(),
    getTicker(),
    getFooterLinks(),
  ])

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        <style dangerouslySetInnerHTML={{ __html: themeCss(settings.theme) }} />
      </head>
      <body
        className={`${locale === 'bn' ? "font-['Noto_Sans_Bengali','Outfit_Variable',sans-serif]" : ''}`}
      >
        <NextIntlClientProvider messages={messages}>
          <MotionProvider value={settings.motion}>
            <Header site={settings.site} megaMenus={megaMenus} exploreBrands={exploreBrands} />
            <Ribbon items={ticker} />
            <main className="mx-auto max-w-[1240px] px-3 pt-[18px] min-[701px]:px-5">
              {children}
            </main>
            <Footer site={settings.site} links={footerLinks} locale={locale} />
            <CartDrawer freeOver={settings.delivery.freeOver} />
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
