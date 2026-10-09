import type { ReactNode } from 'react'

/** A plain, responsive admin table: scrolls sideways inside its card on small screens. */
export default function Table({
  head,
  children,
  testId,
}: {
  head: ReactNode[]
  children: ReactNode
  testId?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table data-testid={testId} className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/10 text-mut">
            {head.map((h, i) => (
              <th key={i} className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:hover]:bg-white/[.03] [&>tr]:border-b [&>tr]:border-white/5 [&_td]:px-2 [&_td]:py-2">
          {children}
        </tbody>
      </table>
    </div>
  )
}
