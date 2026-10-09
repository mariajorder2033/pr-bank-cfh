import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ui } from '@/lib/ui'

type Params = Record<string, string | string[] | undefined>

export default async function Pagination({
  path,
  params,
  page,
  pages,
}: {
  path: string
  params: Params
  page: number
  pages: number
}) {
  if (pages <= 1) return null
  const t = await getTranslations('cat')
  const href = (p: number) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params))
      if (typeof v === 'string' && k !== 'page') qs.set(k, v)
    if (p > 1) qs.set('page', String(p))
    const s = qs.toString()
    return s ? `${path}?${s}` : path
  }
  return (
    <nav className="mt-6 flex items-center justify-center gap-3">
      {page > 1 && (
        <Link href={href(page - 1)} className={ui.btnGhost}>
          {t('prev')}
        </Link>
      )}
      <span className="text-mut">
        {page} / {pages}
      </span>
      {page < pages && (
        <Link href={href(page + 1)} className={ui.btnGhost}>
          {t('next')}
        </Link>
      )}
    </nav>
  )
}
