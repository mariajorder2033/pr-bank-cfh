import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { formatBDT } from '@/lib/domain/money'
import { getProduct } from '@/lib/server/cached'
import { getSettings } from '@/lib/server/content'

// The share preview Facebook, WhatsApp and others show for a product link (PNG, 1200×630).
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Product'

/** The product photo as a PNG data URL (uploads are WebP; share crawlers want PNG/JPEG). */
async function photo(src: string): Promise<string | null> {
  if (!/^\/(uploads\/[\w\-/.]+|ph\.svg)$/.test(src)) return null
  try {
    const bytes = await readFile(join(process.cwd(), 'public', src))
    const png = await sharp(bytes)
      .resize(520, 520, { fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [p, { site, theme }] = await Promise.all([getProduct(slug), getSettings()])
  const img = p ? await photo(p.image) : null
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: theme.bg,
        padding: 48,
        gap: 48,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 534,
          height: 534,
          background: '#fff',
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {img && <img src={img} width={520} height={520} alt="" />}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          color: '#f4ede5',
        }}
      >
        <div style={{ fontSize: 30, color: theme.sand }}>{site.nameEn}</div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, marginTop: 12 }}>
          {p?.title.en ?? site.nameEn}
        </div>
        {p && (
          <div style={{ fontSize: 30, color: '#cfc6bb', marginTop: 12 }}>{p.brand.name.en}</div>
        )}
        {p && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              columnGap: 18,
              marginTop: 28,
            }}
          >
            <div style={{ fontSize: 58, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {formatBDT(p.offerPrice).replace('৳', 'Tk ')}
            </div>
            {p.regularPrice > p.offerPrice && (
              <div
                style={{
                  fontSize: 30,
                  color: '#a89d90',
                  textDecoration: 'line-through',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatBDT(p.regularPrice).replace('৳', 'Tk ')}
              </div>
            )}
          </div>
        )}
        {p && p.discountPercent > 0 && (
          <div
            style={{
              display: 'flex',
              marginTop: 20,
              background: theme.sale,
              color: '#fff',
              fontSize: 30,
              borderRadius: 999,
              padding: '8px 22px',
              alignSelf: 'flex-start',
            }}
          >
            -{p.discountPercent}%
          </div>
        )}
      </div>
    </div>,
    size,
  )
}
