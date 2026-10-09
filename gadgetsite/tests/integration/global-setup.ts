import { resetDatabase } from '../support/reset-db'

/** Recreates the test database and applies all migrations before the integration suite. */
export default async function setup() {
  await resetDatabase(process.env.TEST_DATABASE_URL)
}
