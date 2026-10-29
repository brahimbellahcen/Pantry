import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { ProductGrid } from '@/components/product/ProductGrid'
import type { Product } from '@/types'

interface Props { productId: number }

export function RelatedProducts({ productId }: Props) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    apiClient.get<Product[]>(`/recommendations/products/${productId}`)
      .then(r => setProducts(r.data))
      .catch(() => {})
  }, [productId])

  if (!products.length) return null

  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold text-gray-900 mb-4">You might also like</h2>
      <ProductGrid products={products} />
    </section>
  )
}
