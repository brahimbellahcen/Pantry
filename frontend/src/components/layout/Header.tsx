import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, User, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) { navigate(`/products?q=${encodeURIComponent(search.trim())}`); setSearch('') }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg shrink-0">
          🛒 Pantry
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden flex-1 md:flex">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-3">
          <Link to="/cart" className="relative rounded-lg p-2 hover:bg-gray-100">
            <ShoppingCart className="h-5 w-5 text-gray-700" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              {user?.is_admin && (
                <Link to="/admin" className="text-xs font-medium text-brand-700 hover:underline">Admin</Link>
              )}
              <Link to="/account/orders" className="text-sm text-gray-700 hover:text-brand-700">Orders</Link>
              <Link to="/account/wishlist" className="text-sm text-gray-700 hover:text-brand-700">Wishlist</Link>
              <Link to="/account/profile" className="text-sm text-gray-700 hover:text-brand-700">Profile</Link>
              <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-700">Sign out</button>
            </div>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link to="/login" className="btn-secondary text-sm px-3 py-1.5">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm px-3 py-1.5">Sign up</Link>
            </div>
          )}

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden space-y-2">
          <form onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:outline-none"
            />
          </form>
          {isAuthenticated ? (
            <>
              <Link to="/account/orders" className="block py-1 text-sm text-gray-700">My Orders</Link>
              {user?.is_admin && <Link to="/admin" className="block py-1 text-sm text-brand-700">Admin</Link>}
              <button onClick={logout} className="block py-1 text-sm text-gray-500">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-1 text-sm text-gray-700">Sign in</Link>
              <Link to="/register" className="block py-1 text-sm text-brand-700">Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
