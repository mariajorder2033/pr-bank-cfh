import { decrypt, encrypt } from '@/lib/crypto'
import { db } from '@/lib/db'

// Service keys (SMS gateway, later payment and courier providers) are entered in admin and
// stored encrypted. Reads for use decrypt; reads for display mask (write-only, spec §7).

export type Credential = { provider: string; enabled: boolean; config: Record<string, string> }

export async function readCredential(id: string): Promise<Credential | null> {
  const row = await db.serviceCredential.findUnique({ where: { id } })
  if (!row) return null
  return {
    provider: row.provider,
    enabled: row.enabled,
    config: JSON.parse(decrypt(row.configEncrypted)) as Record<string, string>,
  }
}

/** Saves keys; the admin action (Stage 3) wraps this with the audit log and permissions. */
export async function saveCredential(
  id: string,
  provider: string,
  config: Record<string, string>,
  enabled: boolean,
): Promise<void> {
  const configEncrypted = new Uint8Array(encrypt(JSON.stringify(config)))
  await db.serviceCredential.upsert({
    where: { id },
    create: { id, provider, enabled, configEncrypted },
    update: { provider, enabled, configEncrypted },
  })
}

const mask = (v: string) => `••••${v.slice(-4)}`

/** What admin may see: every value reduced to its last four characters. */
export async function describeCredential(id: string): Promise<Credential | null> {
  const c = await readCredential(id)
  if (!c) return null
  return {
    ...c,
    config: Object.fromEntries(Object.entries(c.config).map(([k, v]) => [k, mask(v)])),
  }
}
