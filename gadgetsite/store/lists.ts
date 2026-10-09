import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_COMPARE = 4

type ListsState = {
  wish: string[]
  cmp: string[]
  toggle: (list: 'wish' | 'cmp', slug: string) => void
}

export const useLists = create<ListsState>()(
  persist(
    (set) => ({
      wish: [],
      cmp: [],
      toggle: (list, slug) =>
        set((s) => {
          const current = s[list]
          if (current.includes(slug)) return { [list]: current.filter((x) => x !== slug) }
          const next = [...current, slug]
          return { [list]: list === 'cmp' ? next.slice(-MAX_COMPARE) : next }
        }),
    }),
    { name: 'gadgetsite-lists' },
  ),
)
