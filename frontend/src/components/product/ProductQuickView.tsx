import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, ShoppingCart, Star, Minus, Plus, Heart, Zap } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { formatPrice } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import type { Product } from '@/types'

interface Props { product: Product | null; onClose: () => void }

export function ProductQuickView({ product, onClose }: Props) {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toggle, isWishlisted } = useWishlist()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  const flash = (product as any)?.flash_sale ?? null
  const displayPrice = flash ? flash.sale_price : product?.price
  const inStock = !product?.inventory?.track_inventory || (product?.inventory?.quantity ?? 0) > 0

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = product ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [product])

  if (!product) return null

  const handleAdd = async () => {
    if (!isAuthenticated) { toast.error('Sign in to add items'); return }
    setAdding(true)
    try {
      await addItem(product.id, qty)
      toast.success(`${product.name} added to cart`)
      onClose()
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Could not add item') }
    finally { setAdding(false) }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <button onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/80 dark:bg-gray-800/80 p-2 hover:bg-white dark:hover:bg-gray-800 shadow">
            <X className="h-4 w-4" />
          </button>

          <div className="grid md:grid-cols-2">
            {/* Image */}
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-tl-2xl rounded-bl-2xl overflow-hidden">
              {product.image_url
                ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-7xl">🥦</div>
              }
            </div>

            {/* Info */}
            <div className="p-6 flex flex-col">
              <p className="text-sm text-brand-600 font-medium">{product.category.name}</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{product.name}</h2>
              {product.unit && <p className="text-sm text-gray-500">{product.unit_quantity} {product.unit}</p>}

              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${flash ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {formatPrice(displayPrice)}
                </span>
                {flash && <span className="text-sm text-gray-400 line-through">{formatPrice(flash.original_price)}</span>}
                {flash && <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Zap className="h-3 w-3 fill-red-500" /> Flash
                </span>}
              </div>

              <p className={`mt-1 text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                {inStock ? 'In stock' : 'Out of stock'}
              </p>

              {product.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{product.description}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button onClick={handleAdd} isLoading={adding} disabled={!inStock} className="flex-1">
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
                {isAuthenticated && (
                  <button onClick={() => toggle(product.id)}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Heart className={`h-5 w-5 ${isWishlisted(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                )}
              </div>

              <Link to={`/products/${product.slug}`} onClick={onClose}
                className="mt-3 text-center text-sm text-brand-600 hover:underline">
                View full details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
