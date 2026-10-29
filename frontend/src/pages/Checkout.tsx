import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { slotsApi, type DeliverySlot } from '@/api/slots'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPrice, formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { Tag, Truck, CreditCard, Banknote } from 'lucide-react'
import { SEO } from '@/components/SEO'

interface AddressForm {
  line1: string; line2: string; city: string; state: string
  postal_code: string; country: string
}

const emptyAddr: AddressForm = { line1: '', line2: '', city: '', state: '', postal_code: '', country: 'US' }

const PAYMENT_METHODS = [
  {
    value: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay when your order arrives.',
    icon: Banknote,
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Bank details sent in your confirmation email.',
    icon: CreditCard,
  },
]

export default function Checkout() {
  const { cart, refresh } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [address, setAddress] = useState<AddressForm>(emptyAddr)
  const [notes, setNotes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [submitting, setSubmitting] = useState(false)

  const defaultAddr = user?.addresses.find(a => a.is_default) ?? user?.addresses[0]
  const [useDefault, setUseDefault] = useState(!!defaultAddr)

  useEffect(() => { slotsApi.list().then(setSlots).catch(() => {}) }, [])

  const items = cart?.items ?? []
  const subtotal = Number(cart?.subtotal ?? 0)
  const shipping = subtotal >= 50 ? 0 : 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...(useDefault && defaultAddr
          ? { shipping_address_id: defaultAddr.id }
          : { shipping_address: address }),
        notes,
        coupon_code: couponCode || undefined,
        delivery_slot_id: selectedSlot ?? undefined,
        payment_method: paymentMethod,
      }
      const res = await ordersApi.checkout(payload)
      await refresh()
      toast.success('Order placed! 🎉')
      navigate(`/account/orders/${res.order.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Checkout failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!items.length) return <div className="py-20 text-center text-gray-500">Your cart is empty.</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SEO title="Checkout" description="Complete your Pantry order" />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
        {/* Left — shipping + payment */}
        <div className="lg:col-span-3 space-y-5">

          {/* Shipping address */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4 text-brand-600" /> Shipping Address
            </h2>
            {defaultAddr && (
              <label className="flex items-center gap-3 rounded-lg border p-3 mb-4 cursor-pointer hover:border-brand-300 transition-colors">
                <input type="checkbox" checked={useDefault}
                  onChange={e => setUseDefault(e.target.checked)} className="rounded accent-brand-600" />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Use saved: </span>
                  {defaultAddr.line1}, {defaultAddr.city}, {defaultAddr.postal_code}
                </span>
              </label>
            )}
            {!useDefault && (
              <div className="space-y-3">
                <Input label="Street address" required value={address.line1}
                  onChange={e => setAddress({ ...address, line1: e.target.value })} />
                <Input label="Apartment, suite, etc." value={address.line2}
                  onChange={e => setAddress({ ...address, line2: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" required value={address.city}
                    onChange={e => setAddress({ ...address, city: e.target.value })} />
                  <Input label="State / Province" value={address.state}
                    onChange={e => setAddress({ ...address, state: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Postal code" required value={address.postal_code}
                    onChange={e => setAddress({ ...address, postal_code: e.target.value })} />
                  <Input label="Country" required value={address.country}
                    onChange={e => setAddress({ ...address, country: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          {/* Delivery slot */}
          {slots.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-3">Delivery Slot (optional)</h2>
              <div className="grid grid-cols-2 gap-2">
                {slots.map(s => (
                  <label key={s.id} className={`flex flex-col rounded-lg border p-2.5 cursor-pointer text-sm transition-colors ${selectedSlot === s.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="slot" value={s.id} checked={selectedSlot === s.id}
                      onChange={() => setSelectedSlot(s.id)} className="sr-only" />
                    <span className="font-medium">{formatDate(s.date)}</span>
                    <span className="text-gray-500">{s.time_window}</span>
                    <span className="text-xs text-brand-600 mt-0.5">{s.available} left</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Coupon */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-600" /> Coupon Code
            </h2>
            <div className="relative">
              <input value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="input uppercase font-mono" />
            </div>
            <p className="mt-1 text-xs text-gray-400">Applied at checkout. Try WELCOME10 for 10% off orders over $20.</p>
          </div>

          {/* Payment method */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Payment Method</h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(m => {
                const Icon = m.icon
                return (
                  <label key={m.value} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${paymentMethod === m.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="payment" value={m.value}
                      checked={paymentMethod === m.value}
                      onChange={() => setPaymentMethod(m.value)}
                      className="accent-brand-600" />
                    <Icon className="h-5 w-5 text-brand-600 shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{m.label}</p>
                      <p className="text-xs text-gray-500">{m.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-2">Notes (optional)</h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="input h-20 resize-none"
              placeholder="Any special delivery instructions…" />
          </div>
        </div>

        {/* Right — order summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>
            <ul className="space-y-2 text-sm">
              {items.map(i => (
                <li key={i.id} className="flex justify-between text-gray-700">
                  <span className="truncate mr-2">{i.product_name} × {i.quantity}</span>
                  <span className="shrink-0">{formatPrice(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span>
                <span>{shipping === 0 ? <span className="text-brand-600 font-medium">Free 🎉</span> : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Tax (8%)</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
            </div>
            {subtotal < 50 && (
              <p className="mt-3 text-xs text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
                Add {formatPrice(50 - subtotal)} more for free shipping!
              </p>
            )}
          </div>

          <Button type="submit" isLoading={submitting} className="w-full py-3 text-base">
            Place Order — {formatPrice(total)}
          </Button>
          <p className="text-center text-xs text-gray-400">
            Your order is protected by our <span className="underline cursor-pointer">returns policy</span>.
          </p>
        </div>
      </form>
    </div>
  )
}
