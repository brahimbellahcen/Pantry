import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWishlist } from '@/contexts/WishlistContext'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { Heart, ShoppingCart } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function Wishlist() {
  const { items, toggle } = useWishlist()
  const { addItem } = useCart()

  const handleMoveToCart = async (product_id: number, name: string) => {
    try {
      await addItem(product_id, 1)
      await toggle(product_id)
      toast.success(`${name} moved to cart`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Could not add to cart')
    }
  }

  if (!items.length) return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        title="Your wishlist is empty"
        description="Heart items while browsing to save them here."
        action={<Link to="/products" className="btn-primary">Browse Products</Link>}
      />
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wishlist ({items.length})</h1>
      <div className="space-y-3">
        {items.map(p => (
          <div key={p.id} className="card flex items-center gap-4 p-4">
            <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
              {p.image_url
                ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-2xl">🛒</div>
              }
            </div>
            <div className="flex-1">
              <Link to={`/products/${p.slug}`} className="font-semibold text-gray-900 hover:text-brand-700">
                {p.name}
              </Link>
              <p className="text-sm text-gray-500">{p.category.name}</p>
            </div>
            <span className="font-bold text-gray-900">{formatPrice(p.price)}</span>
            <Button size="sm" onClick={() => handleMoveToCart(p.id, p.name)}>
              <ShoppingCart className="h-4 w-4" /> Add to Cart
            </Button>
            <button onClick={() => toggle(p.id)} className="text-red-400 hover:text-red-600 p-1">
              <Heart className="h-5 w-5 fill-current" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
