import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { SEO } from '@/components/SEO'

export default function CheckoutSuccess() {
  const [params] = useSearchParams()
  const orderId = params.get('order')

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <SEO title="Order Confirmed" />
      <CheckCircle className="h-16 w-16 text-brand-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900">Order Placed! 🎉</h1>
      <p className="mt-2 text-gray-600 max-w-sm">
        Your order is confirmed. You'll receive a confirmation email shortly.
      </p>
      <div className="mt-6 flex gap-3">
        {orderId && (
          <Link to={`/account/orders/${orderId}`} className="btn-primary">View Order</Link>
        )}
        <Link to="/products" className="btn-secondary">Continue Shopping</Link>
      </div>
    </div>
  )
}
