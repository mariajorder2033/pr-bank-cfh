'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { NAV } from './nav'

export default function Sidebar({ allowed }: { allowed: string[] }) {
  const t = useTranslations('admin.nav')
  const pathname = usePathname()
  const items = NAV.filter((n) => !n.permission || allowed.includes(n.permission))
  const active = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href ||
        (pathname.startsWith(href + '/') &&
          !items.some(
            (i) => i.href !== href && pathname.startsWith(i.href) && i.href.length > href.length,
          ))
  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] min-[1101px]:flex-col min-[1101px]:overflow-visible"
    >
      {items.map((n, i) => (
        <Link
          key={n.href}
          href={n.href}
          data-testid={`nav-${n.key}`}
          aria-current={active(n.href) ? 'page' : undefined}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-[13px] transition-[background-color,color,transform] duration-200 ease-smooth hover:translate-x-0.5 ${i > 0 && items[i - 1].group !== n.group ? 'min-[1101px]:mt-3' : ''} ${active(n.href) ? 'bg-sand font-semibold text-ink' : 'text-[#e8e0d6] hover:bg-white/5'}`}
        >
          {t(n.key)}
        </Link>
      ))}
    </nav>
  )
}
