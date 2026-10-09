import type { ReactNode } from 'react'

export default function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-[22px] font-semibold">{title}</h1>
      {children}
    </div>
  )
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section className="mb-5 rounded-2xl bg-pn p-4 shadow-[0_1px_2px_#0003] min-[701px]:p-5">
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  )
}
