import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPrice } from '@/utils/format'
import { toast } from 'react-hot-toast'

interface AddressForm {
  line1: string; line2: string; city: string; state: string; postal_code: string; country: string
}

const emptyAddr: AddressForm = { line1: '', line2: '', city: '', state: '', postal_code: '', country: 'US' }

export default function Checkout() {
  const { cart, refresh } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState<AddressForm>(emptyAddr)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const defaultAddr = user?.addresses.find((a) => a.is_default) ?? user?.addresses[0]
  const [useDefault, setUseDefault] = useState(!!defaultAddr)

  const items = cart?.items ?? []
  const subtotal = Number(cart?.subtotal ?? 0)
  const shipping = subtotal >= 50 ? 0 : 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = useDefault && defaultAddr
        ? { shipping_address_id: defaultAddr.id, notes }
        : { shipping_address: address, notes }
      const res = await ordersApi.checkout(payload)
      await refresh()
      toast.success('Order placed!')
      navigate(`/account/orders/${res.order.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Checkout failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!items.length) return <div className="py-20 text-center text-gray-500">Your cart is empty.</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
        {/* Left — address */}
        <div className="lg:col-span-3 space-y-5">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Shipping Address</h2>
            {defaultAddr && (
              <label className="flex items-center gap-3 rounded-lg border p-3 mb-4 cursor-pointer">
                <input type="checkbox" checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">
                  Use saved: {defaultAddr.line1}, {defaultAddr.city}, {defaultAddr.postal_code}
                </span>
              </label>
            )}
            {!useDefault && (
              <div className="space-y-3">
                <Input label="Street address" required value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                <Input label="Apartment, suite, etc." value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                  <Input label="State / Province" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Postal code" required value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
                  <Input label="Country" required value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Notes (optional)</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input h-20 resize-none"
              placeholder="Any special delivery instructions…"
            />
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-2">Payment</h2>
            <p className="text-sm text-gray-500">Payment via Stripe is processed securely after placing your order.</p>
          </div>
        </div>

        {/* Right — summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>
            <ul className="space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between text-gray-700">
                  <span className="truncate mr-2">{i.product_name} × {i.quantity}</span>
                  <span className="shrink-0">{formatPrice(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
          </div>
          <Button type="submit" isLoading={submitting} className="w-full py-3 text-base">
            Place Order — {formatPrice(total)}
          </Button>
        </div>
      </form>
    </div>
  )
}
