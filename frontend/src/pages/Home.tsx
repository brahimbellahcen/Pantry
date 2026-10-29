import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '@/api/products'
import { ProductGrid } from '@/components/product/ProductGrid'
import type { Category, Product } from '@/types'
import { ChevronRight } from 'lucide-react'

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([productsApi.featured(), productsApi.listCategories()])
      .then(([f, c]) => { setFeatured(f); setCategories(c) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-600 to-brand-500 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold">Fresh Groceries Delivered 🥕</h1>
          <p className="mt-3 text-lg text-brand-100">Quality produce and pantry staples, at your door in hours.</p>
          <Link to="/products" className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50 transition-colors">
            Shop Now
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
          <Link to="/products" className="flex items-center text-sm text-brand-600 hover:underline">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {categories.slice(0, 12).map((cat) => (
            <Link key={cat.id} to={`/products?category=${cat.slug}`} className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 hover:border-brand-300 hover:shadow-sm transition-all text-center">
              {cat.image_url ? (
                <img src={cat.image_url} alt={cat.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-2xl">🥬</div>
              )}
              <span className="text-xs font-medium text-gray-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
          <Link to="/products?featured=true" className="flex items-center text-sm text-brand-600 hover:underline">
            See more <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <ProductGrid products={featured} isLoading={loading} />
      </section>
    </div>
  )
}
