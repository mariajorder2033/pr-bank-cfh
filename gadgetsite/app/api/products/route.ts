import { getProductsBySlugs } from '@/lib/server/cached'
import { json } from '@/lib/server/http'

const MAX_SLUGS = 24

/** Product cards for client-side lists (wishlist, compare). */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('slugs') ?? ''
  const slugs = [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
  if (slugs.length > MAX_SLUGS) return json({ error: 'too_many_slugs' }, 400)
  return json({ items: slugs.length ? await getProductsBySlugs(slugs) : [] })
}
