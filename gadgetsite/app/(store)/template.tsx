import type { ReactNode } from 'react'

/** Re-mounted on every navigation, so each page fades in instead of snapping. */
export default function StoreTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-fi">{children}</div>
}
