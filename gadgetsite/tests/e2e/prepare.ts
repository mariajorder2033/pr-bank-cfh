// Run by `npm run e2e:serve` before the server starts: a fresh, seeded e2e database plus
// the few fixtures the specs rely on.
import { existsSync } from 'node:fs'
import { resetDatabase } from '../support/reset-db'

if (existsSync('.env')) process.loadEnvFile('.env')
const url = process.env.E2E_DATABASE_URL
process.env.DATABASE_URL = url
await resetDatabase(url)

const { db } = await import('../../lib/db')
const { seed } = await import('../../prisma/seed')
await seed(db)
await db.tickerItem.create({ data: { textEn: 'E2E ribbon item', textBn: 'ই২ই রিবন', sort: 0 } })
await db.$disconnect()
