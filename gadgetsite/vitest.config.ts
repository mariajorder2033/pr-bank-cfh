import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))
if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  resolve: { alias: { '@': root } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          globalSetup: ['tests/integration/global-setup.ts'],
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
        },
      },
    ],
  },
})
