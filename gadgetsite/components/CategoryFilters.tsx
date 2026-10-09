'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { text, type Bilingual, type Locale } from '@/lib/i18n'
import { ui } from '@/lib/ui'

type Props = { brands: { slug: string; name: Bilingual }[] }

/** Filters live in the URL, so every filtered view is shareable and server-rendered. */
export default function CategoryFilters({ brands }: Props) {
  const t = useTranslations('cat')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const selected = new Set(params.get('brands')?.split(',').filter(Boolean) ?? [])

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    next.delete('page')
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const toggleBrand = (slug: string) => {
    const next = new Set(selected)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    update({ brands: [...next].join(',') || null })
  }

  return (
    <aside className="space-y-3.5 self-start min-[1101px]:sticky min-[1101px]:top-14">
      <form
        className={ui.panel}
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          update({ min: String(f.get('min') ?? ''), max: String(f.get('max') ?? '') })
        }}
      >
        <b>{t('budget')}</b>
        <div className="my-2 flex gap-2">
          <input
            name="min"
            inputMode="numeric"
            pattern="\d*"
            defaultValue={params.get('min') ?? ''}
            placeholder={t('min')}
            aria-label={t('min')}
            className={`${ui.input} !p-2`}
          />
          <input
            name="max"
            inputMode="numeric"
            pattern="\d*"
            defaultValue={params.get('max') ?? ''}
            placeholder={t('max')}
            aria-label={t('max')}
            className={`${ui.input} !p-2`}
          />
        </div>
        <button type="submit" className={`${ui.btn} w-full !py-1.5`}>
          {t('apply')}
        </button>
      </form>
      <div className={ui.panel}>
        <b>{t('stock')}</b>
        <label className="mt-2 flex items-center gap-2">
          {/* Uncontrolled so it toggles instantly; keyed so it resyncs after navigation. */}
          <input
            key={params.get('inStock') ?? ''}
            type="checkbox"
            defaultChecked={params.get('inStock') === '1'}
            onChange={(e) => update({ inStock: e.target.checked ? '1' : null })}
          />
          {t('inStock')}
        </label>
      </div>
      {brands.length > 0 && (
        <div className={ui.panel}>
          <b>{t('brands')}</b>
          {brands.map((b) => (
            <label key={b.slug} className="mt-2 flex items-center gap-2">
              <input
                key={`${b.slug}:${selected.has(b.slug)}`}
                type="checkbox"
                defaultChecked={selected.has(b.slug)}
                onChange={() => toggleBrand(b.slug)}
              />
              {text(b.name, locale)}
            </label>
          ))}
        </div>
      )}
      <label className={`${ui.panel} block`}>
        <b>{t('sort')}</b>
        <select
          className={`${ui.input} mt-2 !p-2`}
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })}
        >
          <option value="newest">{t('sortNewest')}</option>
          <option value="price_asc">{t('sortPriceAsc')}</option>
          <option value="price_desc">{t('sortPriceDesc')}</option>
          <option value="discount">{t('sortDiscount')}</option>
        </select>
      </label>
    </aside>
  )
}
