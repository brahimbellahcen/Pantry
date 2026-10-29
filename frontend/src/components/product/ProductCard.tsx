import { Link } from 'react-router-dom'
import { Plus, Heart } from 'lucide-react'
import { formatPrice } from '@/utils/format'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { toast } from 'react-hot-toast'
import type { Product } from '@/types'

interface Props { product: Product }

export function ProductCard({ product }: Props) {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toggle, isWishlisted } = useWishlist()
  const inStock = !product.inventory?.track_inventory || (product.inventory?.quantity ?? 0) > 0
  const discount = product.compare_at_price
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : null

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { toast.error('Sign in to add items to cart'); return }
    if (!inStock) return
    try { await addItem(product.id, 1); toast.success(`${product.name} added to cart`) }
    catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Could not add item') }
  }

  return (
    <Link to={`/products/${product.slug}`} className="group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-5xl">🥦</div>
        }
        {discount && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
        {/* Wishlist heart */}
        {isAuthenticated && (
          <button
            onClick={async (e) => { e.preventDefault(); await toggle(product.id) }}
            className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white transition-colors"
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-4 w-4 ${isWishlisted(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">Out of stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs text-gray-500">{product.category.name}</p>
        <h3 className="mt-0.5 text-sm font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
        {product.unit && <p className="text-xs text-gray-400">{product.unit_quantity} {product.unit}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.compare_at_price && (
              <span className="ml-1.5 text-xs text-gray-400 line-through">{formatPrice(product.compare_at_price)}</span>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!inStock}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Add to cart"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  )
}
