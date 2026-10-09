import type { ProductCard as Card } from '@/lib/server/catalog'
import ProductCard from './ProductCard'

export default function Grid({
  items,
  empty,
  cols = 4,
}: {
  items: Card[]
  empty: string
  cols?: 4 | 5
}) {
  if (!items.length) return <p className="py-16 text-center text-mut">{empty}</p>
  return (
    <div
      className={`grid grid-cols-2 gap-3.5 min-[701px]:grid-cols-3 ${cols === 5 ? 'min-[1101px]:grid-cols-5' : 'min-[1101px]:grid-cols-4'}`}
    >
      {items.map((p) => (
        <ProductCard key={p.slug} p={p} />
      ))}
    </div>
  )
}
