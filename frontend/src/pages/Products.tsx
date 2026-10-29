import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productsApi } from '@/api/products'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/Button'
import type { Product, Category, Page } from '@/types'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<Page<Product> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const featured = searchParams.get('featured') === 'true' ? true : undefined
  const page = Number(searchParams.get('page') ?? 1)

  const [searchInput, setSearchInput] = useState(q)

  useEffect(() => { productsApi.listCategories().then(setCategories) }, [])

  const load = useCallback(() => {
    setLoading(true)
    productsApi.list({ q: q || undefined, category: category || undefined, featured, page, page_size: 20 })
      .then(setData)
      .finally(() => setLoading(false))
  }, [q, category, featured, page])

  useEffect(() => { load() }, [load])

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setParam('q', searchInput || undefined)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar filters */}
        <aside className="w-full md:w-52 shrink-0">
          <h2 className="font-bold text-gray-900 mb-3">Categories</h2>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setParam('category', undefined)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm ${!category ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                All Products
              </button>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setParam('category', c.slug)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm ${category === c.slug ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main */}
        <div className="flex-1">
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <Button type="submit" variant="primary" size="md">Search</Button>
          </form>

          {data && (
            <p className="mb-4 text-sm text-gray-500">{data.total} product{data.total !== 1 ? 's' : ''}</p>
          )}

          <ProductGrid products={data?.items ?? []} isLoading={loading} />

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm text-gray-600">Page {page} of {data.pages}</span>
              <Button variant="secondary" size="sm" disabled={page >= data.pages}
                onClick={() => setParam('page', String(page + 1))}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
