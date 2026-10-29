import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersApi } from '@/api/orders'
import { Spinner, EmptyState } from '@/components/ui/Badge'
import { Badge } from '@/components/ui/Badge'
import { formatPrice, formatDate, orderStatusLabel, orderStatusColor } from '@/utils/format'
import type { OrderSummary, Page } from '@/types'
import { ChevronRight } from 'lucide-react'

export default function OrderHistory() {
  const [data, setData] = useState<Page<OrderSummary> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ordersApi.list(page).then(setData).finally(() => setLoading(false))
  }, [page])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
      {!data?.items.length ? (
        <EmptyState title="No orders yet" description="Your orders will appear here."
          action={<Link to="/products" className="btn-primary">Start Shopping</Link>} />
      ) : (
        <div className="space-y-3">
          {data.items.map((order) => (
            <Link key={order.id} to={`/account/orders/${order.id}`}
              className="card flex items-center gap-4 p-4 hover:border-brand-300 transition-colors">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{order.order_number}</p>
                <p className="text-sm text-gray-500">{formatDate(order.created_at)} · {order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
              </div>
              <Badge label={orderStatusLabel(order.status)} className={orderStatusColor(order.status)} />
              <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          ))}
          {data.pages > 1 && (
            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm">Prev</button>
              <span className="text-sm text-gray-600 py-2">{page} / {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-secondary text-sm">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
