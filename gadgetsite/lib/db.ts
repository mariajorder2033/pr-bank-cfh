import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'

const globalForDb = globalThis as unknown as { db?: PrismaClient }

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  })
}

/** The app's single Prisma client (cached across hot reloads in development). */
export const db = globalForDb.db ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForDb.db = db
