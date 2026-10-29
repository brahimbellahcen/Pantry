import { useState } from 'react'
import { ProductCard } from './ProductCard'
import { ProductQuickView } from './ProductQuickView'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/Badge'
import { Link } from 'react-router-dom'
import type { Product } from '@/types'

interface Props {
  products: Product[]
  isLoading?: boolean
}

export function ProductGrid({ products, isLoading }: Props) {
  const [quickView, setQuickView] = useState<Product | null>(null)

  if (isLoading) return <ProductGridSkeleton />

  if (!products.length) return (
    <EmptyState
      title="No products found"
      description="Try a different search or category."
      action={<Link to="/products" className="btn-primary">View All Products</Link>}
    />
  )

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            onQuickView={() => setQuickView(p)}
          />
        ))}
      </div>
      <ProductQuickView product={quickView} onClose={() => setQuickView(null)} />
    </>
  )
}
