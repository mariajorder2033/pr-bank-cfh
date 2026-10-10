import { expect, test } from './fixtures'

test('a product link carries a share preview with an absolute PNG image', async ({
  page,
  request,
}) => {
  await page.goto('/products/iphone-16-pro')
  const og = (p: string) => page.locator(`meta[property="${p}"]`).getAttribute('content')
  expect(await og('og:title')).toContain('iPhone 16 Pro')
  expect(await og('og:description')).toContain('৳')
  const image = (await og('og:image'))!
  expect(image).toMatch(/^http:\/\/localhost:3100\/.+/)
  const res = await request.get(image)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('image/png')
  expect(await page.locator('meta[name="twitter:card"]').getAttribute('content')).toBe(
    'summary_large_image',
  )
})
