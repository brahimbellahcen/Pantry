import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { ChevronLeft } from 'lucide-react'
import type { OrderSummary } from '@/types'

const VALID_REASONS = [
  { value: 'damaged',          label: 'Item was damaged' },
  { value: 'wrong_item',       label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'quality_issue',    label: 'Quality issue' },
  { value: 'changed_mind',     label: 'Changed my mind' },
  { value: 'other',            label: 'Other' },
]

export default function Returns() {
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [myReturns, setMyReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState('')
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    Promise.all([
      ordersApi.list(1, 50),
      apiClient.get('/returns/mine').then(r => r.data),
    ]).then(([orderData, returns]) => {
      setOrders(orderData.items.filter(o => o.status === 'delivered'))
      setMyReturns(returns)
    }).finally(() => setLoading(false))
  }, [isAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder || !reason) { toast.error('Please select an order and reason'); return }
    setSubmitting(true)
    try {
      await apiClient.post(`/returns/orders/${selectedOrder}`, { reason, details })
      toast.success('Return request submitted')
      const returns = await apiClient.get('/returns/mine').then(r => r.data)
      setMyReturns(returns)
      setSelectedOrder(''); setReason(''); setDetails('')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to submit return')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/account/orders" className="text-brand-600 hover:underline text-sm flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> My Orders
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Return a Item</h1>

      {/* New return form */}
      {orders.length > 0 ? (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Request a Return</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Order</label>
            <select value={selectedOrder} onChange={e => setSelectedOrder(e.target.value)} required className="input">
              <option value="">Choose a delivered order…</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {formatDate(o.created_at)} (${Number(o.total).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} required className="input">
              <option value="">Select a reason…</option>
              {VALID_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Details (optional)</label>
            <textarea value={details} onChange={e => setDetails(e.target.value)}
              className="input h-20 resize-none" placeholder="Describe the issue…" />
          </div>
          <Button type="submit" isLoading={submitting}>Submit Return Request</Button>
        </form>
      ) : (
        <div className="card p-5 text-sm text-gray-500">No delivered orders eligible for return.</div>
      )}

      {/* Existing returns */}
      {myReturns.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">My Return Requests</h2>
          <div className="space-y-3">
            {myReturns.map((r: any) => (
              <div key={r.id} className="flex items-start justify-between border rounded-lg p-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Order #{r.order_id} — {r.reason.replace(/_/g, ' ')}</p>
                  {r.details && <p className="text-gray-500">{r.details}</p>}
                  {r.resolution_note && <p className="text-brand-700 mt-1">{r.resolution_note}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(r.created_at)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0 ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
