import { readFileSync } from 'node:fs'
import { WIDTHS, expect, expectNoHorizontalOverflow, test } from './fixtures'
import { E2E_MARKER_FILE } from './marker'

for (const width of WIDTHS) {
  test(`home has no sideways scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByTestId('site-header')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
}

test.describe('desktop chrome', () => {
  test.use({ viewport: { width: 1536, height: 900 } })

  test('header shows the site name from settings', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('site-header')).toContainText('gadgetsite')
  })

  test('mega menu opens on hover and closes when the pointer leaves the menu row', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByTestId('menu-row').getByRole('link', { name: 'Phones', exact: true }).hover()
    const panel = page.getByTestId('mega-panel')
    await expect(panel).toContainText('Apple')
    await page.mouse.move(5, 800)
    await expect(panel).toBeHidden()
  })

  test('EXPLORE ALL swaps the brand grid per category', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('explore-all').hover()
    await page.getByTestId('explore-categories').getByText('Laptops', { exact: true }).hover()
    await expect(page.getByTestId('explore-brands')).toContainText('Lenovo')
  })

  test('the menu row comes from the admin header menu', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByTestId('menu-row').getByRole('link', { name: 'E2E deals' }),
    ).toBeVisible()
  })

  test('locale toggle switches the menu to Bangla', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('locale-toggle').click()
    await expect(page.getByTestId('menu-row')).toContainText('ফোন')
  })

  test('only the ribbon pins on scroll; the header is not sticky', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 300 })
    await page.goto('/')
    const ribbon = page.getByTestId('ribbon')
    await expect(ribbon).toContainText(readFileSync(E2E_MARKER_FILE, 'utf8'))
    await page.evaluate(() => window.scrollTo(0, 400))
    await expect(ribbon).toHaveClass(/stuck/)
    expect(Math.round((await ribbon.boundingBox())!.y)).toBe(0)
    const position = await page
      .getByTestId('site-header')
      .evaluate((el) => getComputedStyle(el).position)
    expect(['fixed', 'sticky']).not.toContain(position)
  })
})
