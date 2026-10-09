import { test as base, expect, type Page } from '@playwright/test'

export const WIDTHS = [375, 768, 1024, 1440, 1536] as const

/**
 * Every e2e test fails on an uncaught page error or a console error, except messages a test
 * explicitly allows (e.g. Chromium's log line for a page that is meant to be a 404).
 */
export const test = base.extend<{ consoleErrors: string[]; allowedConsoleErrors: RegExp[] }>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error' && !allowedConsoleErrors.some((re) => re.test(m.text())))
          errors.push(m.text())
      })
      await use(errors)
      expect(errors, 'console errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth, 'page scrolls sideways').toBeLessThanOrEqual(innerWidth)
}

export async function setLocale(page: Page, locale: 'en' | 'bn') {
  await page
    .context()
    .addCookies([{ name: 'locale', value: locale, url: page.url() || 'http://localhost:3100' }])
}
