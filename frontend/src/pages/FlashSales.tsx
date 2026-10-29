import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { formatPrice } from '@/utils/format'
import { Zap, Timer } from 'lucide-react'

interface FlashSale {
  id: number; product_id: number; product_name: string; product_slug: string
  product_image_url?: string; original_price: string; sale_price: string
  discount_type: string; discount_value: string
  ends_at: string; seconds_remaining: number
  max_quantity?: number; sold_count: number
}

function Countdown({ seconds: initial }: { seconds: number }) {
  const [secs, setSecs] = useState(initial)
  useEffect(() => {
    if (secs <= 0) return
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="flex items-center gap-1 text-xs font-mono">
      {h > 0 && <><span className="rounded bg-red-600 text-white px-1 py-0.5">{pad(h)}</span><span className="text-red-600 font-bold">:</span></>}
      <span className="rounded bg-red-600 text-white px-1 py-0.5">{pad(m)}</span>
      <span className="text-red-600 font-bold">:</span>
      <span className="rounded bg-red-600 text-white px-1 py-0.5">{pad(s)}</span>
    </div>
  )
}

export default function FlashSales() {
  const [sales, setSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<FlashSale[]>('/flash-sales')
      .then(r => setSales(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><span className="animate-spin h-8 w-8 rounded-full border-4 border-red-500 border-t-transparent" /></div>

  if (!sales.length) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-700">No flash sales right now</h1>
      <p className="text-gray-500 mt-2">Check back soon — deals go fast! ⚡</p>
      <Link to="/products" className="mt-4 inline-block btn-primary">Browse Products</Link>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-6 w-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Flash Sales ⚡</h1>
        <span className="rounded-full bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 animate-pulse">LIVE</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sales.map(sale => {
          const discountPct = Math.round((1 - Number(sale.sale_price) / Number(sale.original_price)) * 100)
          const soldPct = sale.max_quantity ? Math.round((sale.sold_count / sale.max_quantity) * 100) : 0
          return (
            <Link key={sale.id} to={`/products/${sale.product_slug}`}
              className="card overflow-hidden hover:shadow-md transition-shadow group">
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                {sale.product_image_url
                  ? <img src={sale.product_image_url} alt={sale.product_name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  : <div className="flex h-full items-center justify-center text-5xl">🛒</div>
                }
                <span className="absolute left-2 top-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -{discountPct}%
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{sale.product_name}</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-red-600">{formatPrice(sale.sale_price)}</span>
                  <span className="text-sm text-gray-400 line-through">{formatPrice(sale.original_price)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Timer className="h-3.5 w-3.5" /> Ends in:
                  </div>
                  <Countdown seconds={sale.seconds_remaining} />
                </div>
                {sale.max_quantity && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${soldPct > 80 ? 'bg-red-500' : 'bg-brand-500'}`}
                        style={{ width: `${soldPct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{sale.max_quantity - sale.sold_count} left</p>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
