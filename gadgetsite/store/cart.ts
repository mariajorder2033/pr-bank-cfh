import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bilingual } from '@/lib/i18n'

// Prices here are for display only; checkout (Stage 5) recomputes everything on the server.
export type CartLine = {
  variantId: string
  slug: string
  title: Bilingual
  image: string
  price: number
  qty: number
}

type CartState = {
  lines: CartLine[]
  open: boolean
  add: (line: Omit<CartLine, 'qty'>, qty?: number) => void
  setQty: (variantId: string, qty: number) => void
  remove: (variantId: string) => void
  toggle: (open?: boolean) => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (line, qty = 1) =>
        set((s) => ({
          open: true,
          lines: s.lines.some((l) => l.variantId === line.variantId)
            ? s.lines.map((l) => (l.variantId === line.variantId ? { ...l, qty: l.qty + qty } : l))
            : [...s.lines, { ...line, qty }],
        })),
      setQty: (variantId, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => l.variantId !== variantId)
              : s.lines.map((l) => (l.variantId === variantId ? { ...l, qty } : l)),
        })),
      remove: (variantId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      toggle: (open) => set((s) => ({ open: open ?? !s.open })),
    }),
    { name: 'gadgetsite-cart', partialize: (s) => ({ lines: s.lines }) },
  ),
)

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0)
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.qty, 0)
