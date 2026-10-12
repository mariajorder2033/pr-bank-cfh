// Visual tour of the admin panel. Signs in with ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_TOTP_SECRET
// (an owner whose authenticator secret you know), then captures every admin page.
// Usage: node scripts/admin-screenshots.mjs [baseURL=http://localhost:3100] [outDir=docs/screenshots/admin]
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { authenticator } from 'otplib'

const base = process.argv[2] ?? 'http://localhost:3100'
const out = process.argv[3] ?? 'docs/screenshots/admin'
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOTP_SECRET } = process.env
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_TOTP_SECRET)
  throw new Error('Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOTP_SECRET')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
let n = 0
const shot = async (name, full = true) => {
  await page.waitForTimeout(700)
  const file = `${out}/${String(++n).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage: full })
  console.log(file)
}

await page.goto(`${base}/admin/login`)
await shot('login', false)
await page.getByLabel('Email').fill(ADMIN_EMAIL)
await page.getByLabel('Password').fill(ADMIN_PASSWORD)
await page.getByRole('button', { name: 'Continue' }).click()
await page.getByLabel(/6-digit code/).waitFor()
await shot('login-2fa', false)
await page.getByLabel(/6-digit code/).fill(authenticator.generate(ADMIN_TOTP_SECRET))
await page.getByRole('button', { name: /Verify/ }).click()
await page.waitForURL(`${base}/admin`)

const PAGES = [
  ['dashboard', '/admin'],
  ['products', '/admin/products'],
  ['product-new', '/admin/products/new'],
  ['bulk-price-stock', '/admin/products/bulk?category=phones'],
  ['categories', '/admin/categories'],
  ['brands', '/admin/brands'],
  ['badges', '/admin/badges'],
  ['care-plans', '/admin/care-plans'],
  ['footer', '/admin/content/footer'],
  ['customers', '/admin/customers'],
  ['staff', '/admin/users'],
  ['roles', '/admin/roles'],
  ['settings', '/admin/settings'],
  ['api-keys', '/admin/settings/services'],
  ['audit-log', '/admin/audit'],
]
for (const [name, path] of PAGES) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await shot(name)
}
// The editor for a real product.
await page.goto(`${base}/admin/products`, { waitUntil: 'networkidle' })
await page.getByTestId('products-table').getByRole('link').first().click()
await page.getByTestId('product-editor').waitFor()
await shot('product-edit')
// Phone width.
await page.setViewportSize({ width: 375, height: 812 })
await page.goto(`${base}/admin`, { waitUntil: 'networkidle' })
await shot('dashboard-phone')
await browser.close()
console.log(
  errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : `${n} screenshots, no page errors`,
)
process.exit(errors.length ? 1 : 0)
