import { z } from 'zod'
import { db } from '@/lib/db'
import { BD_MOBILE } from '@/lib/domain/phone'
import { isSameOrigin, json } from '@/lib/server/http'

const PreorderRequest = z.object({
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().regex(BD_MOBILE),
  productText: z.string().trim().min(3).max(500),
})

/** "Looking for something different?" requests (PRD §5.6). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ error: 'forbidden' }, 403)
  const parsed = PreorderRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid', issues: parsed.error.issues }, 400)
  await db.preorderRequest.create({ data: { ...parsed.data, name: parsed.data.name || null } })
  return json({ ok: true }, 201)
}
