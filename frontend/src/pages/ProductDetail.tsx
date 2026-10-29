import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productsApi } from '@/api/products'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { ShoppingCart, ChevronRight, Minus, Plus } from 'lucide-react'
import type { Product } from '@/types'

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    productsApi.get(slug).then(setProduct).catch(() => setProduct(null)).finally(() => setLoading(false))
  }, [slug])

  const inStock = !product?.inventory?.track_inventory || (product?.inventory?.quantity ?? 0) > 0
  const maxQty = product?.inventory?.track_inventory ? product.inventory!.quantity : 99

  const handleAdd = async () => {
    if (!isAuthenticated) { toast.error('Sign in to add items to cart'); return }
    setAdding(true)
    try {
      await addItem(product!.id, qty)
      toast.success(`${product!.name} added to cart`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Could not add item')
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>
  if (!product) return <div className="py-32 text-center text-gray-500">Product not found.</div>

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-gray-500">
        <Link to="/" className="hover:text-brand-600">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/products" className="hover:text-brand-600">Products</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/products?category=${product.category.slug}`} className="hover:text-brand-600">{product.category.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="overflow-hidden rounded-2xl bg-gray-100 aspect-square">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-8xl">🛒</div>
          }
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-sm text-brand-600 font-medium">{product.category.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>
          {product.unit && <p className="mt-1 text-sm text-gray-500">{product.unit_quantity} {product.unit}</p>}

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-lg text-gray-400 line-through">{formatPrice(product.compare_at_price)}</span>
            )}
          </div>

          <p className={`mt-2 text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
            {inStock ? `In stock${product.inventory?.track_inventory ? ` (${product.inventory.quantity} available)` : ''}` : 'Out of stock'}
          </p>

          {product.description && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">{product.description}</p>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {product.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{tag}</span>
              ))}
            </div>
          )}

          {/* Quantity + Add */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 p-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="rounded p-1 hover:bg-gray-100" disabled={qty <= 1}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button onClick={() => setQty(Math.min(maxQty, qty + 1))} className="rounded p-1 hover:bg-gray-100" disabled={qty >= maxQty}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={handleAdd} isLoading={adding} disabled={!inStock} className="flex-1">
              <ShoppingCart className="h-4 w-4" />
              Add to Cart — {formatPrice(Number(product.price) * qty)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
