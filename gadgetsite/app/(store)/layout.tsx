import type { ReactNode } from 'react'
import StoreChrome from '@/components/StoreChrome'

// Every page reads admin-managed data; caching comes from the tagged data cache.
export const dynamic = 'force-dynamic'

export default function StoreLayout({ children }: { children: ReactNode }) {
  return <StoreChrome>{children}</StoreChrome>
}
