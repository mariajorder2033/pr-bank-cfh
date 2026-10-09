import { execFileSync } from 'node:child_process'
import { Client } from 'pg'

/** Recreates the test database and applies all migrations before the integration suite. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL is not set')
  const name = new URL(url).pathname.slice(1)
  if (!/^[a-z0-9_]+$/.test(name) || !name.endsWith('_test')) {
    throw new Error(`Refusing to recreate non-test database "${name}"`)
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
