import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatPrice } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

interface Props { open: boolean; onClose: () => void }

export function CartDrawer({ open, onClose }: Props) {
  const { cart, updateItem, removeItem } = useCart()
  const { isAuthenticated } = useAuth()
  const overlayRef = useRef<HTMLDivElement>(null)
  const items = cart?.items ?? []
  const subtotal = Number(cart?.subtotal ?? 0)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleQty = async (id: number, qty: number) => {
    if (qty <= 0) { await removeItem(id); return }
    try { await updateItem(id, qty) }
    catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Failed') }
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-600" />
            Cart {items.length > 0 && <span className="text-sm text-gray-500">({cart?.item_count})</span>}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingBag className="h-12 w-12 text-gray-200 mb-3" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">Your cart is empty</p>
              <p className="text-sm text-gray-400 mt-1">Add some fresh items!</p>
              <button onClick={onClose} className="mt-4 btn-primary text-sm px-4 py-2">Browse Products</button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {item.product_image_url
                    ? <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-xl">🛒</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_slug}`} onClick={onClose}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:text-brand-700 line-clamp-1">
                    {item.product_name}
                  </Link>
                  <p className="text-xs text-gray-500">{formatPrice(item.unit_price)} each</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                  <button onClick={() => handleQty(item.id, item.quantity - 1)}
                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => handleQty(item.id, item.quantity + 1)}
                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(item.line_total)}</p>
                  <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 mt-0.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
            </div>
            {subtotal < 50 && (
              <p className="text-xs text-brand-700 bg-brand-50 dark:bg-brand-950 rounded-lg px-3 py-2">
                Add {formatPrice(50 - subtotal)} more for free shipping! 🚚
              </p>
            )}
            {isAuthenticated ? (
              <Link to="/checkout" onClick={onClose}>
                <Button className="w-full">Checkout — {formatPrice(subtotal)}</Button>
              </Link>
            ) : (
              <Link to="/login" onClick={onClose}>
                <Button className="w-full">Sign in to Checkout</Button>
              </Link>
            )}
            <Link to="/cart" onClick={onClose} className="block text-center text-xs text-brand-600 hover:underline">
              View full cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
