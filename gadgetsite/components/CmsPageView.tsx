import { notFound } from 'next/navigation'
import { text } from '@/lib/i18n'
import { getPage } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'
import CmsBody from './CmsBody'

/** Any admin CMS page by slug, or 404 while it is not visible. */
export default async function CmsPageView({ slug, kinds }: { slug: string; kinds?: string[] }) {
  const [page, locale] = await Promise.all([getPage(slug), currentLocale()])
  if (!page || (kinds && !kinds.includes(page.kind))) notFound()
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-[26px] font-semibold">{text(page.title, locale)}</h1>
      <CmsBody html={page.bodyHtml} locale={locale} />
    </article>
  )
}
