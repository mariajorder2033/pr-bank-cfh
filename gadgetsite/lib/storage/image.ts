import sharp from 'sharp'

export class InvalidImage extends Error {
  constructor(reason: string) {
    super(`Invalid image: ${reason}`)
    this.name = 'InvalidImage'
  }
}

const ACCEPTED = new Set(['jpeg', 'png', 'webp'])
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/**
 * Upload pipeline: only real JPEG/PNG/WebP, auto-rotated, at most 2000 px wide, re-encoded to
 * WebP — which also drops EXIF/GPS metadata and anything hidden in the original file.
 */
export async function processImage(bytes: Buffer): Promise<Buffer> {
  if (bytes.length > MAX_UPLOAD_BYTES) throw new InvalidImage('larger than 5 MB')
  let format: string | undefined
  try {
    format = (await sharp(bytes).metadata()).format
  } catch {
    throw new InvalidImage('unreadable')
  }
  if (!format || !ACCEPTED.has(format)) throw new InvalidImage(`format ${format ?? 'unknown'}`)
  return sharp(bytes)
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
}
