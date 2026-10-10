'use client'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ActionState } from '@/lib/admin/action'
import { sanitizeRichText } from '@/lib/admin/sanitize'
import { discountPercent, effectivePrice } from '@/lib/domain/pricing'
import { ui } from '@/lib/ui'

export type EditorVariant = {
  id?: string
  sku: string
  color: string
  storage: string
  ram: string
  region: string
  offerPrice: string
  regularPrice: string
  salePrice: string
  saleStartsAt: string
  saleEndsAt: string
  stock: string
  images: string[]
}

export type EditorProduct = {
  id?: string
  slug: string
  titleEn: string
  titleBn: string
  brandId: string
  categoryId: string
  status: string
  preorder: boolean
  bookingAmount: string
  lowStockThreshold: string
  warrantyEn: string
  warrantyBn: string
  descriptionHtmlEn: string
  descriptionHtmlBn: string
  badgeIds: string[]
  carePlanIds: string[]
  variants: EditorVariant[]
}

type Option = { value: string; label: string }
type Props = {
  action: (p: ActionState, f: FormData) => Promise<ActionState>
  product: EditorProduct
  brands: Option[]
  categories: Option[]
  badges: Option[]
  carePlans: Option[]
}

const blankVariant = (n: number, slug: string): EditorVariant => ({
  sku: slug ? `${slug}-${n}`.toUpperCase() : '',
  color: '',
  storage: '',
  ram: '',
  region: '',
  offerPrice: '',
  regularPrice: '',
  salePrice: '',
  saleStartsAt: '',
  saleEndsAt: '',
  stock: '0',
  images: [],
})

let keySeq = 0

export default function ProductEditor({
  action,
  product,
  brands,
  categories,
  badges,
  carePlans,
}: Props) {
  const t = useTranslations('admin')
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})
  const [rows, setRows] = useState(() => product.variants.map((v) => ({ key: ++keySeq, ...v })))
  const [descEn, setDescEn] = useState(product.descriptionHtmlEn)
  const preview = useMemo(() => sanitizeRichText(descEn), [descEn])

  const saved = state.ok ? (state.data as { id: string; slug: string } | undefined) : undefined
  useEffect(() => {
    if (saved && !product.id) router.replace(`/admin/products/${saved.id}`)
  }, [saved, product.id, router])

  const err = (name: string) => {
    const code = state.fieldErrors?.[name]?.[0]
    if (!code) return null
    return (
      <small className="text-red-400">
        {t.has(`err.${code}`) ? t(`err.${code}`) : t('err.invalid_value')}
      </small>
    )
  }
  const input = (
    name: string,
    label: string,
    value: string,
    props: Record<string, unknown> = {},
  ) => (
    <label className="grid gap-1">
      <span className="text-[13px]">{label}</span>
      <input
        name={name}
        defaultValue={value}
        className={ui.input}
        aria-invalid={!!state.fieldErrors?.[name]}
        {...props}
      />
      {err(name)}
    </label>
  )
  const select = (name: string, label: string, value: string, options: Option[]) => (
    <label className="grid gap-1">
      <span className="text-[13px]">{label}</span>
      <select name={name} defaultValue={value} className={ui.input}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {err(name)}
    </label>
  )

  async function upload(rowKey: number, file: File) {
    const body = new FormData()
    body.set('file', file)
    const res = await fetch('/admin/uploads', { method: 'POST', body })
    const json = (await res.json()) as { url?: string; error?: string }
    if (json.url) {
      setRows((rs) =>
        rs.map((r) => (r.key === rowKey ? { ...r, images: [...r.images, json.url!] } : r)),
      )
    } else {
      alert(t(`err.${json.error === 'invalid_image' ? 'invalid_image' : 'invalid_value'}`))
    }
  }

  return (
    <form action={formAction} className="grid gap-5" data-testid="product-editor">
      {product.id && <input type="hidden" name="id" value={product.id} />}

      <section className="grid gap-3 rounded-2xl bg-pn p-4 min-[701px]:grid-cols-2 min-[701px]:p-5">
        {input('titleEn', t('p.titleEn'), product.titleEn, { required: true })}
        {input('titleBn', t('p.titleBn'), product.titleBn)}
        {input('slug', t('f.slug'), product.slug, { required: true })}
        {select('status', t('p.status'), product.status, [
          { value: 'draft', label: t('p.draft') },
          { value: 'active', label: t('p.active') },
          { value: 'archived', label: t('p.archived') },
        ])}
        {select('brandId', t('p.brand'), product.brandId, brands)}
        {select('categoryId', t('p.category'), product.categoryId, categories)}
        {input('warrantyEn', t('p.warrantyEn'), product.warrantyEn)}
        {input('warrantyBn', t('p.warrantyBn'), product.warrantyBn)}
        {input('lowStockThreshold', t('p.lowStock'), product.lowStockThreshold, {
          type: 'number',
          min: 0,
        })}
        <div className="grid content-start gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="preorder"
              value="on"
              defaultChecked={product.preorder}
              className="size-4 accent-[var(--sand)]"
            />
            {t('p.preorder')}
          </label>
          {input('bookingAmount', t('p.booking'), product.bookingAmount, {
            type: 'number',
            min: 0,
          })}
        </div>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[13px]">{t('p.badges')}</legend>
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <label key={b.value} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="badgeIds"
                  value={b.value}
                  defaultChecked={product.badgeIds.includes(b.value)}
                  className="accent-[var(--sand)]"
                />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[13px]">{t('p.carePlans')}</legend>
          <div className="flex flex-wrap gap-3">
            {carePlans.length ? (
              carePlans.map((c) => (
                <label key={c.value} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="carePlanIds"
                    value={c.value}
                    defaultChecked={product.carePlanIds.includes(c.value)}
                    className="accent-[var(--sand)]"
                  />
                  {c.label}
                </label>
              ))
            ) : (
              <span className="text-mut">—</span>
            )}
          </div>
        </fieldset>
      </section>

      <section className="grid gap-3 rounded-2xl bg-pn p-4 min-[701px]:grid-cols-2 min-[701px]:p-5">
        <label className="grid gap-1 min-[701px]:col-span-2">
          <span className="text-[13px]">{t('p.descEn')}</span>
          <textarea
            name="descriptionHtmlEn"
            rows={6}
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            className={`${ui.input} font-mono text-xs`}
          />
        </label>
        <div className="min-[701px]:col-span-2">
          <div className="mb-1 text-[13px] text-mut">{t('p.preview')}</div>
          <div
            data-testid="description-preview"
            className="rounded-xl bg-[#14181b] p-3 font-serif leading-7"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
        <label className="grid gap-1 min-[701px]:col-span-2">
          <span className="text-[13px]">{t('p.descBn')}</span>
          <textarea
            name="descriptionHtmlBn"
            rows={4}
            defaultValue={product.descriptionHtmlBn}
            className={`${ui.input} font-mono text-xs`}
          />
        </label>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('p.variants')}</h2>
          <button
            type="button"
            className={ui.btnGhost}
            onClick={() =>
              setRows((rs) => [
                ...rs,
                { key: ++keySeq, ...blankVariant(rs.length + 1, product.slug) },
              ])
            }
          >
            + {t('p.addVariant')}
          </button>
        </div>
        {err('variants')}
        {rows.map((r, i) => {
          const p = (k: string) => `variants.${i}.${k}`
          const offer = Number(r.offerPrice) || 0
          const regular = Number(r.regularPrice) || 0
          const sale = effectivePrice(
            {
              offerPrice: offer,
              salePrice: r.salePrice ? Number(r.salePrice) : null,
              saleStartsAt: r.saleStartsAt ? new Date(`${r.saleStartsAt}:00+06:00`) : null,
              saleEndsAt: r.saleEndsAt ? new Date(`${r.saleEndsAt}:00+06:00`) : null,
            },
            new Date(),
          )
          const set = (k: keyof EditorVariant) => (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, [k]: e.target.value } : x)))
          const field = (
            k: keyof EditorVariant,
            label: string,
            props: Record<string, unknown> = {},
          ) => (
            <label className="grid gap-1">
              <span className="text-[12px] text-mut">{label}</span>
              <input
                name={p(k)}
                value={r[k] as string}
                onChange={set(k)}
                className={`${ui.input} !p-2`}
                aria-invalid={!!state.fieldErrors?.[p(k)]}
                {...props}
              />
              {err(p(k))}
            </label>
          )
          return (
            <div
              key={r.key}
              data-testid="variant-row"
              className="grid animate-rise gap-3 rounded-2xl bg-pn p-4"
            >
              {r.id && <input type="hidden" name={p('id')} value={r.id} />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{t('p.variant', { n: i + 1 })}</b>
                <span className="text-[12px] text-mut">
                  {regular > 0 && `${discountPercent(regular, Math.min(sale.price, regular))}% · `}
                  {sale.onSale && <span className="text-ok">{t('p.onSaleNow')}</span>}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="text-red-300 hover:underline"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  >
                    {t('p.removeVariant')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 min-[701px]:grid-cols-3 min-[1101px]:grid-cols-6">
                {field('sku', t('p.sku'), { required: true })}
                {field('color', t('p.color'))}
                {field('storage', t('p.storage'))}
                {field('ram', t('p.ram'))}
                {field('region', t('p.region'))}
                {field('stock', t('p.stock'), { type: 'number', min: 0 })}
                {field('offerPrice', t('p.offer'), { type: 'number', min: 0, required: true })}
                {field('regularPrice', t('p.regular'), { type: 'number', min: 0, required: true })}
                {field('salePrice', t('p.sale'), { type: 'number', min: 0 })}
                {field('saleStartsAt', t('p.saleStart'), { type: 'datetime-local' })}
                {field('saleEndsAt', t('p.saleEnd'), { type: 'datetime-local' })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.images.map((src, j) => (
                  <span key={src + j} className="group relative">
                    <input type="hidden" name={p('images')} value={src} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="size-16 rounded-lg bg-white object-contain p-1"
                    />
                    <button
                      type="button"
                      aria-label={t('remove')}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-[#5a1e1e] text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() =>
                        setRows((rs) =>
                          rs.map((x) =>
                            x.key === r.key
                              ? { ...x, images: x.images.filter((_, k) => k !== j) }
                              : x,
                          ),
                        )
                      }
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <label className="cursor-pointer rounded-lg border border-dashed border-white/20 px-3 py-4 text-[12px] text-mut transition-colors hover:border-sand hover:text-sand">
                  + {t('p.upload')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void upload(r.key, file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>
          )
        })}
      </section>

      <div className="bg-bg/95 sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-white/5 px-4 py-3 backdrop-blur min-[701px]:-mx-6 min-[701px]:px-6">
        <button type="submit" disabled={pending} className={ui.btn}>
          {t('save')}
        </button>
        {state.ok && (
          <span role="status" className="animate-fi text-ok">
            {t('saved')}
          </span>
        )}
        {state.error && (
          <span role="alert" className="text-red-400">
            {t.has(`err.${state.error}`) ? t(`err.${state.error}`) : state.error}
          </span>
        )}
        {state.fieldErrors && !state.error && (
          <span role="alert" className="text-red-400">
            {t('err.invalid_value')}
          </span>
        )}
      </div>
    </form>
  )
}
