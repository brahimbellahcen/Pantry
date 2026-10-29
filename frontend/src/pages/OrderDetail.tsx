import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ordersApi } from '@/api/orders'
import { Spinner } from '@/components/ui/Badge'
import { Badge } from '@/components/ui/Badge'
import { OrderTimeline } from '@/components/order/OrderTimeline'
import { formatPrice, formatDate, orderStatusLabel, orderStatusColor } from '@/utils/format'
import type { Order } from '@/types'
import { ChevronLeft } from 'lucide-react'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ordersApi.get(Number(id)).then(setOrder).catch(() => setOrder(null)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!order) return <div className="py-20 text-center text-gray-500">Order not found.</div>

  const addr = order.shipping_address

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/account/orders" className="mb-4 flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back to Orders
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
        <Badge label={orderStatusLabel(order.status)} className={orderStatusColor(order.status)} />
      </div>

      {/* Order Timeline */}
      <div className="card p-5 mb-4">
        <OrderTimeline status={order.status} />
      </div>

      <div className="card p-5 mb-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{formatDate(order.created_at)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="capitalize">{order.payment_status}</span></div>
        {order.estimated_delivery && (
          <div className="flex justify-between"><span className="text-gray-500">Est. delivery</span><span>{formatDate(order.estimated_delivery)}</span></div>
        )}
      </div>

      {/* Items */}
      <div className="card p-5 mb-4">
        <h2 className="font-bold text-gray-900 mb-3">Items</h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                {item.product_image_url
                  ? <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-2xl">🛒</div>
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                <p className="text-xs text-gray-500">{formatPrice(item.unit_price)} × {item.quantity}</p>
              </div>
              <span className="font-semibold text-sm">{formatPrice(item.total_price)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Totals */}
      <div className="card p-5 mb-4 text-sm space-y-2">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{Number(order.shipping_amount) === 0 ? 'Free' : formatPrice(order.shipping_amount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.tax_amount)}</span></div>
        <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatPrice(order.total)}</span></div>
      </div>

      {/* Address */}
      {addr && (
        <div className="card p-5 text-sm">
          <h2 className="font-bold text-gray-900 mb-2">Shipping Address</h2>
          <p className="text-gray-600">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
          <p className="text-gray-600">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code}</p>
          <p className="text-gray-600">{addr.country}</p>
        </div>
      )}
    </div>
  )
}
