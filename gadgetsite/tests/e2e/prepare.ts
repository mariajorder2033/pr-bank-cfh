// Run by `npm run e2e:serve` before the server starts: a fresh, seeded e2e database plus
// the few fixtures the specs rely on.
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { resetDatabase } from '../support/reset-db'
import { E2E_MARKER_FILE } from './marker'

if (existsSync('.env')) process.loadEnvFile('.env')
const url = process.env.E2E_DATABASE_URL
process.env.DATABASE_URL = url
await resetDatabase(url)

const { db } = await import('../../lib/db')
const { seed } = await import('../../prisma/seed')
await seed(db)
// A marker unique to this run: specs check the page shows it, so data cached from an
// earlier database can never make a run pass.
const marker = `E2E ribbon ${randomUUID().slice(0, 8)}`
mkdirSync(dirname(E2E_MARKER_FILE), { recursive: true })
writeFileSync(E2E_MARKER_FILE, marker)
await db.tickerItem.create({ data: { textEn: marker, textBn: marker, sort: 0 } })
const header = await db.menu.findUniqueOrThrow({ where: { location: 'header' } })
await db.menu.update({
  where: { location: 'header' },
  data: {
    items: [
      ...(header.items as object[]),
      { label: { en: 'E2E deals', bn: 'ই২ই অফার' }, href: '/online-exclusive' },
    ],
  },
})
await db.$disconnect()
