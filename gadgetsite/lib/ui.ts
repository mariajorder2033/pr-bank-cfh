// Shared Tailwind class recipes (one place to restyle the whole storefront).
export const ui = {
  panel: 'rounded-2xl bg-pn p-4',
  btn: 'rounded-[10px] bg-sand px-5 py-2.5 font-semibold text-ink shadow-[0_1px_0_#0003] transition-[transform,filter,box-shadow,opacity] duration-200 ease-smooth hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_#d2a67980] hover:brightness-105 active:translate-y-0 active:scale-[.97] disabled:pointer-events-none disabled:opacity-40',
  btnGhost:
    'rounded-[10px] bg-[#3a332c] px-5 py-2.5 text-white transition-[transform,background-color] duration-200 ease-smooth hover:-translate-y-px hover:bg-[#4a4036] active:scale-[.97]',
  input:
    'w-full rounded-lg border border-[#3d352d] bg-[#14181b] p-3 text-[#f4ede5] outline-none transition-[border-color,box-shadow] duration-200 ease-smooth placeholder:text-[#6f665c] focus:border-sand focus:ring-2 focus:ring-sand/40',
  seeAll:
    'rounded-lg bg-[#fbf3ea] px-3.5 py-1.5 text-xs font-normal text-ink transition-[transform,background-color] duration-200 ease-smooth hover:-translate-y-px hover:bg-white',
  iconBox:
    'cursor-pointer rounded-[10px] bg-[#2a2521] px-3 py-2 transition-[background-color,transform] duration-200 ease-smooth hover:bg-[#3a332c] active:scale-95',
  grid5: 'grid grid-cols-2 gap-3.5 md:grid-cols-5',
  grid4: 'grid grid-cols-2 gap-3.5 md:grid-cols-4',
  row: 'flex justify-between py-1',
  total: 'mt-1.5 flex justify-between border-t border-[#4a4036] pt-2.5 text-[17px] font-semibold',
} as const
