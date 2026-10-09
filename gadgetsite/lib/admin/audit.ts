import { isDeepStrictEqual } from 'node:util'
import { db } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'

type Tx = Prisma.TransactionClient
type Change<T> = { before: unknown; after: unknown; result: T }

/** JSON-safe copy for the audit log (Dates → ISO strings, Bytes and secrets left out). */
function snapshot(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined
  return JSON.parse(
    JSON.stringify(value, (k, v) =>
      /hash|secret|encrypted/i.test(k) ? '[redacted]' : v instanceof Uint8Array ? '[bytes]' : v,
    ),
  )
}

/**
 * Runs an admin write and its audit_logs row in one transaction (golden rule 5): either both
 * happen or neither does. A write that changed nothing leaves no audit row.
 */
export async function audited<T>(
  actorId: string,
  action: 'create' | 'update' | 'delete',
  entity: string,
  entityId: string | ((result: NoInfer<T>) => string),
  fn: (tx: Tx) => Promise<Change<T>>,
  ip?: string,
): Promise<T> {
  return db.$transaction(async (tx) => {
    const { before, after, result } = await fn(tx)
    const b = snapshot(before)
    const a = snapshot(after)
    if (!isDeepStrictEqual(b, a)) {
      await tx.auditLog.create({
        data: {
          actorId,
          action,
          entity,
          entityId: typeof entityId === 'function' ? entityId(result) : entityId,
          before: b,
          after: a,
          ip,
        },
      })
    }
    return result
  })
}
