import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

if (existsSync('.env')) process.loadEnvFile('.env')

const PORT = 3100
// Its own Redis database, cleared before each run, so rate limits never carry over.
export const E2E_REDIS_URL =
  (process.env.REDIS_URL ?? 'redis://localhost:6379').replace(/\/\d*$/, '') + '/2'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: 'npm run e2e:serve',
    port: PORT,
    reuseExistingServer: false, // a stale server would serve an old build
    timeout: 300_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
      APP_URL: `http://localhost:${PORT}`,
      REDIS_URL: E2E_REDIS_URL,
      SMS_PROVIDER: 'console',
      SMS_CONSOLE_FILE: 'node_modules/.cache/gadgetsite-e2e/sms.jsonl',
    },
  },
})
