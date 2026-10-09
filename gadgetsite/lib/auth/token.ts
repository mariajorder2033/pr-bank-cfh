import { createHash, randomBytes } from 'node:crypto'

/** A 256-bit random token for cookies; only its hash is ever stored. */
export const newToken = (): string => randomBytes(32).toString('base64url')

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex')
