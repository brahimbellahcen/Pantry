import { Link } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function Cart() {
  const { cart, updateItem, removeItem, isLoading } = useCart()
  const items = cart?.items ?? []

  const handleQty = async (itemId: number, newQty: number) => {
    if (newQty <= 0) { await removeItem(itemId); return }
    try { await updateItem(itemId, newQty) }
    catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Failed to update') }
  }

  if (!items.length) return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        title="Your cart is empty"
        description="Add some fresh items to get started."
        action={<Link to="/products" className="btn-primary">Browse Products</Link>}
      />
    </div>
  )

  const subtotal = Number(cart?.subtotal ?? 0)
  const shipping = subtotal >= 50 ? 0 : 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card flex gap-4 p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.product_image_url
                  ? <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-3xl">🛒</div>
                }
              </div>
              <div className="flex flex-1 flex-col">
                <Link to={`/products/${item.product_slug}`} className="text-sm font-semibold text-gray-900 hover:text-brand-700">
                  {item.product_name}
                </Link>
                <p className="text-xs text-gray-500">{formatPrice(item.unit_price)} each</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                    <button onClick={() => handleQty(item.id, item.quantity - 1)} className="rounded p-1 hover:bg-gray-100">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => handleQty(item.id, item.quantity + 1)} className="rounded p-1 hover:bg-gray-100">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{formatPrice(item.line_total)}</span>
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card h-fit p-5 space-y-3">
          <h2 className="font-bold text-gray-900">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Tax (8%)</span><span>{formatPrice(tax)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          {subtotal < 50 && (
            <p className="text-xs text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
              Add {formatPrice(50 - subtotal)} more for free shipping!
            </p>
          )}
          <Link to="/checkout">
            <Button className="w-full mt-2">
              <ShoppingBag className="h-4 w-4" /> Proceed to Checkout
            </Button>
          </Link>
          <Link to="/products" className="block text-center text-xs text-brand-600 hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
