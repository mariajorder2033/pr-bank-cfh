// Visual tour of the storefront: screenshots every page at desktop and phone width.
// Usage: start the app (e.g. `npm run e2e:serve`), then
//   node scripts/screenshots.mjs [baseURL=http://localhost:3100] [outDir=docs/screenshots]
// Set PLAYWRIGHT_CHROMIUM_PATH when no Playwright browser is downloaded.
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:3100'
const out = process.argv[3] ?? 'docs/screenshots'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const PAGES = [
  ['home', '/'],
  ['category-phones', '/category/phones'],
  ['category-filtered', '/category/laptops?inStock=1&sort=price_asc'],
  ['product', '/products/iphone-16-pro'],
  ['product-preorder', '/products/galaxy-buds3-pro'],
  ['brands', '/brands'],
  ['search', '/search?q=galxy'],
  ['online-exclusive', '/online-exclusive'],
  ['pre-order', '/pre-order'],
  ['emi-policy', '/emi-policy'],
  ['blogs', '/blogs'],
  ['wishlist', '/wishlist'],
  ['compare', '/compare'],
  ['login', '/account/login'],
  ['signup', '/account/signup'],
  ['not-found', '/this-page-does-not-exist'],
]
const SIZES = { desktop: { width: 1536, height: 900 }, phone: { width: 375, height: 812 } }

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const problems = []
let shot = 0

async function capture(ctx, name, path, act, fullPage = true) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`))
  await page.goto(base + path, { waitUntil: 'networkidle' })
  if (act) await act(page)
  await page.waitForTimeout(1000) // let entrance animations finish
  const file = `${out}/${String(++shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage })
  await page.close()
  console.log(file)
}

for (const [size, viewport] of Object.entries(SIZES)) {
  const ctx = await browser.newContext({ viewport })
  for (const [name, path] of PAGES) await capture(ctx, `${name}-${size}`, path)
  await ctx.close()
}

// Interactions and states on desktop.
const ctx = await browser.newContext({ viewport: SIZES.desktop })
await capture(
  ctx,
  'mega-menu',
  '/',
  (p) => p.getByTestId('menu-row').getByRole('link', { name: 'Phones', exact: true }).hover(),
  false,
)
await capture(
  ctx,
  'explore-all',
  '/',
  async (p) => {
    await p.getByTestId('explore-all').hover()
    await p.getByTestId('explore-categories').getByText('Laptops', { exact: true }).hover()
  },
  false,
)
await capture(
  ctx,
  'product-variant-unavailable',
  '/products/iphone-16-pro',
  (p) => p.getByRole('button', { name: 'Black Titanium' }).click(),
  false,
)
await capture(
  ctx,
  'cart-drawer',
  '/products/iphone-16-pro',
  (p) => p.getByTestId('add-to-cart').click(),
  false,
)
await capture(
  ctx,
  'login-sms-tab',
  '/account/login',
  (p) =>
    p
      .getByRole('tab', { name: 'SMS code' })
      .click()
      .catch(() => {}),
  false,
)
await capture(
  ctx,
  'login-error',
  '/account/login',
  async (p) => {
    await p.getByLabel('Mobile number').fill('01700000000')
    await p.getByLabel('Password', { exact: true }).fill('not-the-password')
    await p.getByRole('button', { name: 'Log in', exact: true }).click()
    await p.getByRole('alert').waitFor()
  },
  false,
)
// A signed-in account page (creates a throwaway customer on the target database).
await capture(ctx, 'account', '/account/signup', async (p) => {
  await p.getByLabel('Full name').fill('Screenshot Customer')
  await p.getByLabel('Mobile number').fill(`019${String(Date.now()).slice(-8)}`)
  await p.getByLabel('Password', { exact: true }).fill('screenshot-pass')
  await p.getByRole('button', { name: 'Create account' }).click()
  await p.waitForURL(/\/account$/)
})
await ctx.close()

// Bangla.
const bn = await browser.newContext({ viewport: SIZES.desktop })
await bn.addCookies([{ name: 'locale', value: 'bn', url: base }])
for (const [name, path] of [
  ['home', '/'],
  ['category-phones', '/category/phones'],
  ['product', '/products/iphone-16-pro'],
  ['login', '/account/login'],
]) {
  await capture(bn, `${name}-bangla`, path, undefined, false)
}
await bn.close()
await browser.close()

console.log(
  problems.length ? `PAGE ERRORS:\n${problems.join('\n')}` : `${shot} screenshots, no page errors`,
)
process.exit(problems.length ? 1 : 0)
