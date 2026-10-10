import '@fontsource-variable/outfit'
import '@fontsource/noto-sans-bengali/400.css'
import '@fontsource/noto-sans-bengali/600.css'
import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import type { ThemeSettings } from '@/lib/content/schemas'
import type { Locale } from '@/lib/i18n'
import { loc } from '@/lib/i18n'
import { getSettings } from '@/lib/server/cached'

// The theme and title come from admin settings, read per request.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const [{ site }, locale] = await Promise.all([getSettings(), getLocale()])
  // Absolute URLs for share previews (og:image, canonical) come from APP_URL.
  const base = process.env.APP_URL
  return {
    title: loc(site, 'name', locale as Locale),
    metadataBase: base ? new URL(base) : undefined,
    openGraph: { siteName: site.nameEn },
  }
}

// Saved light/dark choice, applied before paint.
const NO_FLASH =
  "try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}"

/** Admin theme tokens for the default (dark) theme; the light theme keeps its own palette. */
function themeCss(theme: ThemeSettings): string {
  return `:root:not(.light){--bg:${theme.bg};--pn:${theme.panel};--sand:${theme.sand};--sale:${theme.sale};--ok:${theme.success}}`
}

/** Document shell shared by the storefront and the admin panel. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale
  const [messages, settings] = await Promise.all([getMessages(), getSettings()])

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        <style dangerouslySetInnerHTML={{ __html: themeCss(settings.theme) }} />
      </head>
      <body
        className={`${locale === 'bn' ? "font-['Noto_Sans_Bengali','Outfit_Variable',sans-serif]" : ''}`}
      >
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
