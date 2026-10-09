import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ProductBuy from '@/components/ProductBuy'
import { text } from '@/lib/i18n'
import { getProduct } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'
import { ui } from '@/lib/ui'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [p, locale, t] = await Promise.all([getProduct(slug), currentLocale(), getTranslations()])
  if (!p) notFound()
  const title = text(p.title, locale)
  const description = text(p.descriptionHtml, locale)

  return (
    <>
      <p className="text-mut">
        <Link href="/">{t('cat.home')}</Link> ›{' '}
        <Link href={`/category/${p.category.slug}`}>{text(p.category.name, locale)}</Link> › {title}
      </p>
      <div className="mt-3 grid gap-5 min-[1101px]:grid-cols-[1fr_1.1fr]">
        <div className={`${ui.panel} self-start min-[1101px]:sticky min-[1101px]:top-14`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={title} className="w-full rounded-xl" />
        </div>
        <ProductBuy p={p} />
      </div>
      {description && (
        <section className={`${ui.panel} mt-6 font-serif leading-7`}>
          <h2 className="mb-2 font-sans text-lg font-semibold">{t('pd.description')}</h2>
          {/* Sanitised when admin saves it (Stage 3); seed HTML is trusted. */}
          <div dangerouslySetInnerHTML={{ __html: description }} />
        </section>
      )}
    </>
  )
}
