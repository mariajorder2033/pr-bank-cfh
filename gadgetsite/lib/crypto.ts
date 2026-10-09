import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM for secrets at rest (spec §7: provider credentials encrypted, write-only).
// Blob layout: iv (12 bytes) | auth tag (16 bytes) | ciphertext.

function key(): Buffer {
  const hex = process.env.CREDENTIALS_KEY ?? ''
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('CREDENTIALS_KEY must be 64 hex characters')
  return Buffer.from(hex, 'hex')
}

export function encrypt(plain: string): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data])
}

export function decrypt(blob: Uint8Array): string {
  const buf = Buffer.from(blob)
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
}
