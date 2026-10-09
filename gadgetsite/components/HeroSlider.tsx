'use client'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { text, type Locale } from '@/lib/i18n'
import type { Banner } from '@/lib/server/content'
import { useMotion } from './MotionProvider'

const ENTER_FROM_LEFT = 'translateX(calc(-1 * (var(--sw) + var(--gap))))'

/**
 * Hero banners (TRD §9): every cycle the last slide moves to the front off-screen left
 * and slides in. One interval per instance; paused while the tab is hidden; no autoplay
 * with reduced motion.
 */
export default function HeroSlider({ banners }: { banners: Banner[] }) {
  const locale = useLocale() as Locale
  const { heroCycleMs, heroSlideMs, heroEasing } = useMotion()
  const [order, setOrder] = useState(banners.map((_, i) => i))
  const track = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (banners.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      if (!document.hidden) setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)])
    }, heroCycleMs)
    return () => clearInterval(id)
  }, [banners.length, heroCycleMs])

  useLayoutEffect(() => {
    const el = track.current
    if (!el || firstRender.current) {
      firstRender.current = false
      return
    }
    el.style.transition = 'none'
    el.style.transform = ENTER_FROM_LEFT
    void el.offsetHeight // force reflow so the jump is not animated
    el.style.transition = `transform ${heroSlideMs}ms ${heroEasing}`
    el.style.transform = 'none'
  }, [order, heroSlideMs, heroEasing])

  if (!banners.length) return null
  return (
    <section className="hero my-2">
      <div className="overflow-hidden rounded-2xl">
        <div ref={track} className="flex gap-[var(--gap)] will-change-transform">
          {order.map((i) => {
            const b = banners[i]
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={text(b.image, locale)}
                alt={text(b.alt, locale)}
                className="aspect-[875/441] w-full rounded-2xl object-cover"
              />
            )
            return (
              <div key={b.id} className="flex-none basis-[var(--sw)]">
                {b.link ? <Link href={b.link}>{img}</Link> : img}
              </div>
            )
          })}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="mt-3.5 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <i
              key={b.id}
              className={`h-[9px] rounded-full transition-all ${i === order[0] ? 'w-[28px] bg-[#eab51a]' : 'w-[9px] bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
