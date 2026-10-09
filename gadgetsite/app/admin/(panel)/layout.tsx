import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import LocaleToggle from '@/components/LocaleToggle'
import Sidebar from '@/components/admin/Sidebar'
import { requirePage } from '@/lib/admin/guard'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requirePage()
  const t = await getTranslations('admin')
  return (
    <div className="min-h-dvh min-[1101px]:grid min-[1101px]:grid-cols-[220px_1fr]">
      <aside className="border-b border-white/5 bg-[#1c1814] min-[1101px]:sticky min-[1101px]:top-0 min-[1101px]:h-dvh min-[1101px]:border-b-0 min-[1101px]:border-r">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-serif text-xl font-extrabold text-white">
            {t('title')}
          </Link>
        </div>
        <Sidebar allowed={[...admin.permissions]} />
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-end gap-2 border-b border-white/5 px-4 py-2.5 text-xs">
          <span className="mr-auto text-mut" data-testid="admin-email">
            {admin.user.email} · {admin.roles.join(', ')}
          </span>
          <Link href="/" className="rounded-lg px-3 py-2 text-sand hover:bg-white/5">
            {t('nav.storefront')} ↗
          </Link>
          <LocaleToggle />
          <form action="/admin/logout" method="post">
            <button type="submit" className="rounded-lg bg-[#3a332c] px-3 py-2 hover:bg-[#4a4036]">
              {t('signOut')}
            </button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl animate-fi p-4 min-[701px]:p-6">{children}</main>
      </div>
    </div>
  )
}
