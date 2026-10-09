import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { TAGS } from '@/lib/server/cached'
import { requestMeta } from '@/lib/server/request'
import { Forbidden, requireAdmin, type PermissionCode } from './guard'

export type ActionState<R = unknown> = {
  ok?: boolean
  data?: R
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
}

export class ActionError extends Error {
  constructor(
    readonly code: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(code)
    this.name = 'ActionError'
  }
}

/**
 * Form fields → nested object: `label.en` → { label: { en } }, `variants.0.sku` → arrays,
 * repeated names → arrays.
 */
export function formDataToObject(f: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of f.entries()) {
    if (key.startsWith('$ACTION')) continue
    const value = typeof raw === 'string' ? raw : raw
    const path = key.replace(/\[\]$/, '').split('.')
    let node: Record<string, unknown> | unknown[] = out
    path.forEach((seg, i) => {
      const last = i === path.length - 1
      const nextIsIndex = /^\d+$/.test(path[i + 1] ?? '')
      const k = /^\d+$/.test(seg) ? Number(seg) : seg
      const container = node as Record<string | number, unknown>
      if (last) {
        const existing = container[k]
        container[k] =
          existing === undefined
            ? value
            : Array.isArray(existing)
              ? [...existing, value]
              : [existing, value]
      } else {
        container[k] ??= nextIsIndex ? [] : {}
        node = container[k] as Record<string, unknown>
      }
    })
  }
  return out
}

const isPrisma = (e: unknown, code: string) =>
  typeof e === 'object' && e !== null && (e as { code?: unknown }).code === code

/**
 * Wraps an admin server action: permission check, Zod validation, error mapping and cache
 * revalidation. Handlers do their writes through `audited(...)`.
 */
export function adminAction<S extends z.ZodType, R>(
  permission: PermissionCode,
  schema: S,
  tags: (keyof typeof TAGS)[],
  handler: (input: z.infer<S>, ctx: { actorId: string; ip: string }) => Promise<R>,
) {
  return async (_prev: ActionState, formData: FormData): Promise<ActionState<R>> => {
    let actorId: string
    try {
      actorId = (await requireAdmin(permission)).user.id
    } catch (e) {
      if (e instanceof Forbidden) return { ok: false, error: 'forbidden' }
      throw e
    }
    const parsed = schema.safeParse(formDataToObject(formData))
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error)
      const fieldErrors: Record<string, string[]> = { ...flat.fieldErrors } as Record<
        string,
        string[]
      >
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        if (key && !fieldErrors[key]) fieldErrors[key] = [issue.message]
      }
      return { ok: false, fieldErrors }
    }
    try {
      const data = await handler(parsed.data, { actorId, ip: (await requestMeta()).ip })
      for (const t of tags) revalidateTag(TAGS[t])
      return { ok: true, data }
    } catch (e) {
      if (e instanceof ActionError) return { ok: false, error: e.code, fieldErrors: e.fieldErrors }
      if (isPrisma(e, 'P2002')) return { ok: false, fieldErrors: { slug: ['taken'] } }
      if (isPrisma(e, 'P2003')) return { ok: false, error: 'in_use' }
      throw e
    }
  }
}
