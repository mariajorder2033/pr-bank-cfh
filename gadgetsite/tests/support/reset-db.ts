import { execFileSync } from 'node:child_process'
import { Client } from 'pg'

/**
 * Drops, recreates and migrates a throwaway database. Refuses any name that does not end
 * in _test or _e2e, so it can never be pointed at real data.
 */
export async function resetDatabase(url: string | undefined): Promise<void> {
  if (!url) throw new Error('Database URL is not set')
  const name = new URL(url).pathname.slice(1)
  if (!/^[a-z0-9_]+_(test|e2e)$/.test(name)) {
    throw new Error(`Refusing to recreate non-throwaway database "${name}"`)
  }
  const admin = new URL(url)
  admin.pathname = '/postgres'
  const client = new Client({ connectionString: admin.toString() })
  await client.connect()
  await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  await client.query(`CREATE DATABASE ${name}`)
  await client.end()
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })
}
