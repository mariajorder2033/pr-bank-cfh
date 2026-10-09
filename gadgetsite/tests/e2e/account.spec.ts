import { readFileSync } from 'node:fs'
import { expect, expectNoHorizontalOverflow, setLocale, test } from './fixtures'
import { SMS_FILE } from './marker'

let n = 0
const phone = () => `019${String(Date.now()).slice(-6)}${String(++n).padStart(2, '0')}`

const codeFor = (p: string) =>
  readFileSync(SMS_FILE, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as { phone: string; text: string })
    .filter((m) => m.phone === p)
    .at(-1)!
    .text.match(/\d{6}/)![0]

async function signUp(page: import('@playwright/test').Page, p: string, name = 'Rafi Ahmed') {
  await page.goto('/account/signup')
  await page.getByLabel('Full name').fill(name)
  await page.getByLabel('Mobile number').fill(p)
  await page.getByLabel('Password', { exact: true }).fill('secret-pass')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/account$/)
}

test('sign up, see the account and the name in the header, then log out', async ({ page }) => {
  await signUp(page, phone())
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rafi Ahmed')
  await expect(page.getByTestId('account-link')).toContainText('Rafi')
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.goto('/account')
  await expect(page).toHaveURL(/\/account\/login/)
})

test('password login shows an error for a wrong password and works with the right one', async ({
  page,
}) => {
  const p = phone()
  await signUp(page, p)
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.goto('/account/login')
  await page.getByLabel('Mobile number').fill(p)
  await page.getByLabel('Password', { exact: true }).fill('wrong-pass')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByText('Wrong mobile number or password.')).toBeVisible()
  // The phone stays filled in after a failed attempt.
  await expect(page.getByLabel('Mobile number')).toHaveValue(p)
  await page.getByLabel('Password', { exact: true }).fill('secret-pass')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL(/\/account$/)
})

test('SMS code login creates and opens an account', async ({ page }) => {
  const p = phone()
  await page.goto('/account/login')
  await page.getByRole('tab', { name: 'SMS code' }).click()
  await page.getByLabel('Mobile number').fill(p)
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByLabel('6-digit code')).toBeVisible()
  await page.getByLabel('6-digit code').fill(codeFor(p))
  await page.getByRole('button', { name: 'Log in with code' }).click()
  await expect(page).toHaveURL(/\/account$/)
})

test('the login page works in Bangla and on a phone', async ({ page }) => {
  await page.goto('/')
  await setLocale(page, 'bn')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/account/login')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('লগইন')
  await expectNoHorizontalOverflow(page)
})
