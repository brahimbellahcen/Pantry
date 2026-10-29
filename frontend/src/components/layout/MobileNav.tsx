import { Link, useLocation } from 'react-router-dom'
import { Home, Search, ShoppingCart, Heart, User } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/format'

const NAV = [
  { to: '/',                 icon: Home,        label: 'Home' },
  { to: '/products',         icon: Search,      label: 'Search' },
  { to: '/cart',             icon: ShoppingCart, label: 'Cart',  badge: true },
  { to: '/account/wishlist', icon: Heart,       label: 'Saved',  auth: true },
  { to: '/account/orders',   icon: User,        label: 'Account', auth: true },
]

export function MobileNav() {
  const { pathname } = useLocation()
  const { itemCount } = useCart()
  const { isAuthenticated } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 md:hidden safe-area-pb">
      <div className="grid grid-cols-5">
        {NAV.map(({ to, icon: Icon, label, badge, auth }) => {
          if (auth && !isAuthenticated) return null
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <Link key={to} to={to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400'
              )}>
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge && itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          )
        })}
        {/* Fill empty slots for non-auth users */}
        {!isAuthenticated && [0, 1].map(i => <div key={i} />)}
      </div>
    </nav>
  )
}
