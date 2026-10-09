// Shared Tailwind class recipes (one place to restyle the whole storefront).
export const ui = {
  panel: 'rounded-2xl bg-pn p-4',
  btn: 'rounded-[10px] bg-sand px-5 py-2.5 font-semibold text-ink transition hover:-translate-y-px active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
  btnGhost: 'rounded-[10px] bg-[#3a332c] px-5 py-2.5 text-white transition hover:-translate-y-px',
  input:
    'w-full rounded-lg border border-[#3d352d] bg-[#14181b] p-3 text-[#f4ede5] outline-none focus:ring-2 focus:ring-sand',
  seeAll: 'rounded-lg bg-[#fbf3ea] px-3.5 py-1.5 text-xs font-normal text-ink',
  iconBox: 'cursor-pointer rounded-[10px] bg-[#2a2521] px-3 py-2',
  grid5: 'grid grid-cols-2 gap-3.5 md:grid-cols-5',
  grid4: 'grid grid-cols-2 gap-3.5 md:grid-cols-4',
  row: 'flex justify-between py-1',
  total: 'mt-1.5 flex justify-between border-t border-[#4a4036] pt-2.5 text-[17px] font-semibold',
} as const
