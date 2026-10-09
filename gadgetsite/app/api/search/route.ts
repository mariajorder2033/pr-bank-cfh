import { searchProducts } from '@/lib/server/cached'
import { json } from '@/lib/server/http'

/** Header search suggestions. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  return json({ items: await searchProducts(q, 8) })
}
