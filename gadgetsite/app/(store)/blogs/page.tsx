import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { text } from '@/lib/i18n'
import { listBlogPosts } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'
import { ui } from '@/lib/ui'

export default async function BlogsPage() {
  const [posts, locale, t] = await Promise.all([
    listBlogPosts(),
    currentLocale(),
    getTranslations('pg'),
  ])
  return (
    <>
      <h1 className="mb-4 text-[22px] font-semibold">{t('blogs')}</h1>
      {posts.length ? (
        <div className="grid gap-3.5 min-[701px]:grid-cols-2 min-[1101px]:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blogs/${p.slug}`} className={ui.panel}>
              <b className="block text-base">{text(p.title, locale)}</b>
              <small className="text-sand">{t('read')} →</small>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-mut">{t('none')}</p>
      )}
    </>
  )
}
