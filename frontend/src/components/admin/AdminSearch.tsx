import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import { Search, Package, ShoppingBag, Users, Tag } from 'lucide-react'

interface Result { type: string; id: number; title: string; subtitle: string; url: string }

const TYPE_ICON: Record<string, React.ElementType> = {
  product: Package, order: ShoppingBag, user: Users, category: Tag,
}
const TYPE_COLOR: Record<string, string> = {
  product: 'text-brand-600', order: 'text-blue-600',
  user: 'text-purple-600', category: 'text-orange-600',
}

export function AdminSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    clearTimeout(timer.current)
    if (val.trim().length < 2) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await adminApi.globalSearch(val)
        setResults(data); setOpen(true)
      } catch {} finally { setLoading(false) }
    }, 250)
  }

  const go = (url: string) => {
    navigate(url); setQuery(''); setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search everything…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 overflow-hidden">
          {results.map((r, i) => {
            const Icon = TYPE_ICON[r.type] ?? Search
            return (
              <button key={i} onClick={() => go(r.url)}
                className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                <Icon className={`h-4 w-4 shrink-0 ${TYPE_COLOR[r.type] ?? 'text-gray-400'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
                </div>
                <span className="ml-auto shrink-0 text-[10px] text-gray-400 capitalize">{r.type}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
