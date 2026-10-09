import { WIDTHS, expect, expectNoHorizontalOverflow, setLocale, test } from './fixtures'

const ROUTES = ['/', '/category/phones', '/products/iphone-16-pro', '/brands', '/search?q=galaxy']

for (const width of WIDTHS) {
  test(`no sideways scroll on storefront pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ROUTES) {
      await page.goto(route)
      await expectNoHorizontalOverflow(page)
    }
  })
}

test('home renders the builder rows with taka prices', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hot deals' })).toBeVisible()
  await expect(page.getByTestId('product-card').first()).toContainText('৳')
})

test('category filters by brand and stock through the URL', async ({ page }) => {
  await page.goto('/category/phones?brands=apple')
  const cards = page.getByTestId('product-card')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('iPhone')
  await page.getByLabel('In stock only').check()
  await expect(page).toHaveURL(/inStock=1/)
})

test('product page follows the chosen variant', async ({ page }) => {
  await page.goto('/products/iphone-16-pro')
  const price = page.getByTestId('offer-price')
  await expect(price).toHaveText('৳1,59,999')
  // Black Titanium exists only in 256GB, so it is marked unavailable next to 128GB.
  await expect(page.getByRole('button', { name: 'Black Titanium' })).toHaveAttribute(
    'data-unavailable',
    'true',
  )
  await page.getByRole('button', { name: '256GB' }).click()
  await expect(price).toHaveText('৳1,74,999')
  await page.getByRole('button', { name: 'Black Titanium' }).click()
  await expect(page.getByText('Sorry! This variant is not available')).toBeVisible()
  await expect(page.getByTestId('add-to-cart')).toBeDisabled()
  await page.getByRole('button', { name: 'Desert Titanium' }).click()
  await page.getByRole('button', { name: '128GB' }).click()
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('cart-count')).toHaveText('1')
})

test('pre-order product shows its booking amount and cannot be added', async ({ page }) => {
  await page.goto('/products/galaxy-buds3-pro')
  await expect(page.getByText('Book now with ৳5,000')).toBeVisible()
  await expect(page.getByTestId('add-to-cart')).toBeDisabled()
})

test.describe('unknown pages', () => {
  test.use({ allowedConsoleErrors: [/status of 404/] })
  for (const route of ['/products/does-not-exist', '/category/nope', '/nope-page']) {
    test(`${route} is a 404`, async ({ page }) => {
      const res = await page.goto(route)
      expect(res!.status()).toBe(404)
    })
  }
})

test('pre-order request form validates and submits', async ({ page }) => {
  await page.goto('/pre-order')
  await page.getByLabel('Phone (01XXXXXXXXX)').fill('12345')
  await page.getByLabel('Which product?').fill('Pixel 10 Pro')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Enter a valid Bangladeshi mobile number.')).toBeVisible()
  await page.getByLabel('Phone (01XXXXXXXXX)').fill('01712345678')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Request sent! We will contact you.')).toBeVisible()
})

test('a liked product shows on the wishlist', async ({ page }) => {
  await page.goto('/category/phones?brands=google')
  await page.getByTestId('wish-toggle').first().click()
  await page.goto('/wishlist')
  await expect(page.getByTestId('product-card')).toContainText('Pixel 9')
})

test('Bangla shows Bangla names and falls back to English titles', async ({ page }) => {
  await page.goto('/')
  await setLocale(page, 'bn')
  await page.goto('/category/phones')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ফোন')
  await expect(page.getByTestId('product-card').first()).not.toHaveText('')
  await expect(page.getByText('Samsung Galaxy S25 Ultra')).toBeVisible()
})
