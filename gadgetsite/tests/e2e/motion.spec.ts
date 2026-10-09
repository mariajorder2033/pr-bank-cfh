import { expect, test } from './fixtures'

test('cards animate in with the shared easing', async ({ page }) => {
  await page.goto('/')
  const card = page.getByTestId('product-card').first()
  await expect(card).toBeVisible()
  const { name, easing } = await card.evaluate((el) => {
    const s = getComputedStyle(el)
    return { name: s.animationName, easing: s.transitionTimingFunction }
  })
  expect(name).toBe('rise')
  expect(easing).toBe('cubic-bezier(0.22, 0.8, 0.2, 1)')
})

test.describe('reduced motion', () => {
  test.use({ colorScheme: 'dark', reducedMotion: 'reduce' })

  test('turns animations and transitions off', async ({ page }) => {
    await page.goto('/')
    const card = page.getByTestId('product-card').first()
    const { name, duration } = await card.evaluate((el) => {
      const s = getComputedStyle(el)
      return { name: s.animationName, duration: s.transitionDuration }
    })
    expect(name).toBe('none')
    expect(duration).toBe('0s')
  })
})
