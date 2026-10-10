import sharp from 'sharp'
import { expect, test } from 'vitest'
import { InvalidImage, processImage } from '@/lib/storage/image'

test('re-encodes a large PNG to WebP no wider than 2000 px', async () => {
  const png = await sharp({
    create: { width: 3000, height: 100, channels: 3, background: '#d2a679' },
  })
    .png()
    .toBuffer()
  const out = await processImage(png)
  const meta = await sharp(out).metadata()
  expect(meta.format).toBe('webp')
  expect(meta.width).toBe(2000)
})

test('refuses text and SVG', async () => {
  await expect(processImage(Buffer.from('not an image'))).rejects.toBeInstanceOf(InvalidImage)
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
  )
  await expect(processImage(svg)).rejects.toBeInstanceOf(InvalidImage)
})
