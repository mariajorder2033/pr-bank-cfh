'use client'
import { useEffect, useState } from 'react'

/**
 * False during SSR and the first client render, true after mount. Persisted stores
 * (cart, wishlist) only render their contents once hydrated, so server and client HTML match.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
