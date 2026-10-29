import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Search, Tag } from 'lucide-react'

interface Suggestion { id: number; name: string; slug: string; type: 'product' | 'category' }
interface Results { products: Suggestion[]; categories: Suggestion[] }

export function SearchAutocomplete() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    clearTimeout(timer.current)
    if (val.trim().length < 2) { setResults(null); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await apiClient.get<Results>('/autocomplete', { params: { q: val } })
        setResults(data)
        setOpen(true)
      } catch {} finally { setLoading(false) }
    }, 200)
  }

  const go = (type: string, slug: string) => {
    setOpen(false); setQuery('')
    navigate(type === 'category' ? `/products?category=${slug}` : `/products/${slug}`)
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) { navigate(`/products?q=${encodeURIComponent(query.trim())}`); setQuery(''); setOpen(false) }
  }

  const all = [...(results?.products ?? []), ...(results?.categories ?? [])]

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <form onSubmit={submitSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => results && all.length > 0 && setOpen(true)}
            placeholder="Search products…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />}
        </div>
      </form>

      {open && all.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {results?.categories && results.categories.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Categories</p>
              {results.categories.map(s => (
                <button key={s.id} onClick={() => go('category', s.slug)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-brand-50 text-left">
                  <Tag className="h-3.5 w-3.5 text-brand-500 shrink-0" /> {s.name}
                </button>
              ))}
            </div>
          )}
          {results?.products && results.products.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Products</p>
              {results.products.map(s => (
                <button key={s.id} onClick={() => go('product', s.slug)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-brand-50 text-left">
                  <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" /> {s.name}
                </button>
              ))}
            </div>
          )}
          <button onClick={submitSearch}
            className="w-full px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 text-left border-t border-gray-100">
            Search all results for "<strong>{query}</strong>" →
          </button>
        </div>
      )}
    </div>
  )
}
