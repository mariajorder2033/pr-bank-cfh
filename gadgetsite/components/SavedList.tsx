'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatBDT } from '@/lib/domain/money'
import { text, type Locale } from '@/lib/i18n'
import type { ProductCard as Card } from '@/lib/server/catalog'
import { useHydrated } from '@/lib/use-hydrated'
import { useLists } from '@/store/lists'
import ProductCard from './ProductCard'

/** Wishlist (cards) or compare (table), loaded from the browser's saved slugs. */
export default function SavedList({ list }: { list: 'wish' | 'cmp' }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const hydrated = useHydrated()
  const slugs = useLists((s) => s[list])
  const [items, setItems] = useState<Card[] | null>(null)
  const key = slugs.join(',')

  useEffect(() => {
    if (!hydrated) return
    if (!key) return setItems([])
    const ctrl = new AbortController()
    fetch(`/api/products?slugs=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { items: Card[] }) => setItems(d.items))
      .catch(() => {})
    return () => ctrl.abort()
  }, [hydrated, key])

  if (items === null) return null
  if (!items.length) return <p className="py-16 text-center text-mut">{t('pg.none')}</p>
  if (list === 'wish') {
    return (
      <div className="grid grid-cols-2 gap-3.5 min-[701px]:grid-cols-3 min-[1101px]:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left">
        <tbody>
          <tr>
            <th />
            {items.map((p) => (
              <th key={p.slug} className="p-2 align-top">
                {text(p.title, locale)}
              </th>
            ))}
          </tr>
          <tr>
            <td className="p-2 text-mut">{t('misc.price')}</td>
            {items.map((p) => (
              <td key={p.slug} className="p-2">
                {formatBDT(p.offerPrice, locale)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-2 text-mut">{t('misc.brand')}</td>
            {items.map((p) => (
              <td key={p.slug} className="p-2">
                {text(p.brand.name, locale)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-2 text-mut">{t('cat.stock')}</td>
            {items.map((p) => (
              <td key={p.slug} className="p-2">
                {t(`stock.${p.stockStatus}`)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
