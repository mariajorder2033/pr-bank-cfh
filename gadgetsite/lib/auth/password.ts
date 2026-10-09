import { hash, verify } from '@node-rs/argon2'

// argon2id with OWASP's minimum recommended cost (19 MiB, 2 passes).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const

export const hashPassword = (password: string): Promise<string> => hash(password, OPTIONS)

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password)
  } catch {
    return false
  }
}

/**
 * Verified against when no account exists, so an unknown phone costs the same time as a
 * wrong password and the two cannot be told apart.
 */
export const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$Zr5rj0X0ZcNG2kV0mm1CPzVh3dYz6Lpt0XKzeEbcnSQ'
