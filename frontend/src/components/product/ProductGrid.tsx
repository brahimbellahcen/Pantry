import { ProductCard } from './ProductCard'
import { Spinner, EmptyState } from '@/components/ui/Badge'
import type { Product } from '@/types'

interface Props {
  products: Product[]
  isLoading?: boolean
}

export function ProductGrid({ products, isLoading }: Props) {
  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner /></div>
  )
  if (!products.length) return (
    <EmptyState title="No products found" description="Try a different search or category." />
  )
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
