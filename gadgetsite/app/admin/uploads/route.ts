import { Forbidden, requireAdmin } from '@/lib/admin/guard'
import { isSameOrigin } from '@/lib/server/http'
import { getStorage, uploadKey } from '@/lib/storage'
import { InvalidImage, MAX_UPLOAD_BYTES, processImage } from '@/lib/storage/image'

/** Image upload for admin forms: one file field `file`, answered with `{ url }`. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 })
  try {
    await requireAdmin('catalog.write')
  } catch (e) {
    if (e instanceof Forbidden) return Response.json({ error: 'forbidden' }, { status: 403 })
    return Response.json({ error: 'signed_out' }, { status: 401 })
  }
  if (Number(req.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return Response.json({ error: 'too_large' }, { status: 413 })
  }
  const file = (await req.formData()).get('file')
  if (!(file instanceof File)) return Response.json({ error: 'no_file' }, { status: 400 })
  try {
    const webp = await processImage(Buffer.from(await file.arrayBuffer()))
    const url = await getStorage().put(uploadKey('webp'), webp, 'image/webp')
    return Response.json({ url }, { status: 201 })
  } catch (e) {
    if (e instanceof InvalidImage) return Response.json({ error: 'invalid_image' }, { status: 400 })
    throw e
  }
}
