import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // Optional so `prisma generate` (postinstall) works before .env exists; migrate fails loudly without it.
  datasource: { url: process.env.DATABASE_URL ?? '' },
})
