import { Link } from 'react-router-dom'
import { Plus, Heart, Zap, Eye } from 'lucide-react'
import { formatPrice } from '@/utils/format'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { toast } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import type { Product } from '@/types'

interface Props { product: Product; onQuickView?: () => void }

function FlashCountdown({ seconds: initial }: { seconds: number }) {
  const [secs, setSecs] = useState(initial)
  useEffect(() => {
    if (secs <= 0) return
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(secs / 60), s = secs % 60
  return <span className="font-mono">{m}:{String(s).padStart(2, '0')}</span>
}

export function ProductCard({ product, onQuickView }: Props) {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toggle, isWishlisted } = useWishlist()
  const inStock = !product.inventory?.track_inventory || (product.inventory?.quantity ?? 0) > 0
  const flash = (product as any).flash_sale ?? null
  const displayPrice = flash ? flash.sale_price : product.price
  const originalPrice = flash ? flash.original_price : product.compare_at_price
  const discountPct = originalPrice
    ? Math.round((1 - Number(displayPrice) / Number(originalPrice)) * 100)
    : null

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { toast.error('Sign in to add items to cart'); return }
    if (!inStock) return
    try { await addItem(product.id, 1); toast.success(`${product.name} added`) }
    catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Could not add item') }
  }

  return (
    <Link to={`/products/${product.slug}`}
      className="group relative flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
        {product.image_url
          ? <img src={product.image_url} alt={product.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
          : <div className="flex h-full items-center justify-center text-5xl">🥦</div>
        }
        {flash && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
              <Zap className="h-3 w-3 fill-white" /> -{discountPct}%
            </span>
            <span className="rounded-full bg-black/70 text-white text-[10px] px-1.5 py-0.5">
              <FlashCountdown seconds={flash.seconds_remaining} />
            </span>
          </div>
        )}
        {!flash && discountPct && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discountPct}%
          </span>
        )}
        {/* Hover actions */}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isAuthenticated && (
            <button onClick={async (e) => { e.preventDefault(); await toggle(product.id) }}
              className="rounded-full bg-white/90 dark:bg-gray-800/90 p-1.5 shadow hover:bg-white"
              aria-label="Wishlist">
              <Heart className={`h-4 w-4 ${isWishlisted(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
            </button>
          )}
          {onQuickView && (
            <button onClick={e => { e.preventDefault(); onQuickView() }}
              className="rounded-full bg-white/90 dark:bg-gray-800/90 p-1.5 shadow hover:bg-white"
              aria-label="Quick view">
              <Eye className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">Out of stock</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs text-gray-500">{product.category.name}</p>
        <h3 className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{product.name}</h3>
        {product.unit && <p className="text-xs text-gray-400">{product.unit_quantity} {product.unit}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div>
            <span className={`text-base font-bold ${flash ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {formatPrice(displayPrice)}
            </span>
            {originalPrice && (
              <span className="ml-1.5 text-xs text-gray-400 line-through">{formatPrice(originalPrice)}</span>
            )}
          </div>
          <button onClick={handleAdd} disabled={!inStock}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
            aria-label="Add to cart">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  )
}
