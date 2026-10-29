import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Badge'
import { formatPrice, formatDate, orderStatusLabel, orderStatusColor } from '@/utils/format'
import { toast } from 'react-hot-toast'
import type { OrderSummary, Page } from '@/types'

const STATUSES = ['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [data, setData] = useState<Page<OrderSummary> | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.listOrders(page, 25, status || undefined).then(setData).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page, status])

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId)
    try { await adminApi.updateOrderStatus(orderId, newStatus); toast.success('Status updated'); load() }
    catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
    finally { setUpdatingId(null) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
          {STATUSES.map(s => <option key={s} value={s}>{s ? orderStatusLabel(s) : 'All statuses'}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Order', 'Date', 'Items', 'Total', 'Status', 'Update Status'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.items.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-brand-700">{o.order_number}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{o.item_count}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(o.total)}</td>
                  <td className="px-4 py-3"><Badge label={orderStatusLabel(o.status)} className={orderStatusColor(o.status)} /></td>
                  <td className="px-4 py-3">
                    <select
                      disabled={updatingId === o.id}
                      value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs"
                    >
                      {['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map(s =>
                        <option key={s} value={s}>{orderStatusLabel(s)}</option>
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.pages > 1 && (
            <div className="flex justify-center gap-3 p-4">
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
