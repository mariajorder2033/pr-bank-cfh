'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { text, type Bilingual, type Locale } from '@/lib/i18n'
import { useMotion } from './MotionProvider'

type Item = { text: Bilingual; link: string | null }

/**
 * Marquee ribbon (TRD §9): scrolls at settings.motion.tickerPxPerS and pins to the top
 * once the header has scrolled away. The header itself is never sticky.
 */
export default function Ribbon({ items }: { items: Item[] }) {
  const locale = useLocale() as Locale
  const { tickerPxPerS } = useMotion()
  const sentinel = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) =>
      setStuck(!entry.isIntersecting && window.scrollY > 0),
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => setDuration(el.scrollWidth / 2 / tickerPxPerS)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tickerPxPerS, items])

  if (!items.length) return null
  const loop = [...items, ...items] // duplicated so translateX(-50%) loops seamlessly

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        data-testid="ribbon"
        className={`sticky top-0 z-40 mx-auto mt-2.5 w-[min(1240px,calc(100%-24px))] overflow-hidden rounded-lg bg-pn px-5 py-2.5 text-[11px] text-mut transition-[background-color,border-radius,box-shadow] duration-[250ms] min-[701px]:w-[min(1240px,calc(100%-60px))] ${stuck ? 'stuck rounded-b-[14px] rounded-t-none bg-[rgba(66,62,57,.96)] shadow-lg backdrop-blur-[8px]' : ''}`}
      >
        <div
          ref={track}
          className="inline-flex animate-mq gap-16 whitespace-nowrap hover:[animation-play-state:paused]"
          style={duration ? { animationDuration: `${duration}s` } : undefined}
        >
          {loop.map((item, i) => {
            const label = text(item.text, locale)
            return (
              <span
                key={i}
                aria-hidden={i >= items.length}
                className="before:mr-2.5 before:text-[9px] before:text-[#e0242e] before:content-['●']"
              >
                {item.link ? <Link href={item.link}>{label}</Link> : label}
              </span>
            )
          })}
        </div>
      </div>
    </>
  )
}
