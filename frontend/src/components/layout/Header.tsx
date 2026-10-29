import { Link } from 'react-router-dom'
import { ShoppingCart, User, Menu, X, Moon, Sun, Zap, Globe } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useI18n } from '@/contexts/I18nContext'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'
import { CartDrawer } from '@/components/cart/CartDrawer'

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const { itemCount } = useCart()
  const { isDark, setTheme } = useTheme()
  const { lang, setLang, t } = useI18n()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const LANGS = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇲🇦' },
  ] as const

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg shrink-0">
          🛒 Pantry
        </Link>

        {/* Search */}
        <div className="hidden flex-1 md:flex">
          <SearchAutocomplete />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">

          {/* Flash sales link */}
          <Link to="/flash-sales" className="hidden md:flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950 rounded-full px-2 py-1 hover:bg-red-100 transition-colors">
            <Zap className="h-3 w-3 fill-red-500" /> Flash
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(v => !v)}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center gap-1"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{lang}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 overflow-hidden">
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false) }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${lang === l.code ? 'text-brand-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart — opens drawer */}
          <button onClick={() => setCartOpen(true)} className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ShoppingCart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              {user?.is_admin && (
                <Link to="/admin" className="text-xs font-medium text-brand-700 dark:text-brand-400 hover:underline">{t('nav.admin')}</Link>
              )}
              <Link to="/account/orders" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-700">
                <User className="h-5 w-5" />
              </Link>
              <button onClick={logout} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700">{t('nav.signout')}</button>
            </div>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link to="/login" className="btn-secondary text-sm px-3 py-1.5">{t('nav.signin')}</Link>
              <Link to="/register" className="btn-primary text-sm px-3 py-1.5">{t('nav.signup')}</Link>
            </div>
          )}

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 md:hidden space-y-2">
          <SearchAutocomplete />
          {isAuthenticated ? (
            <>
              <Link to="/account/orders" className="block py-1 text-sm text-gray-700 dark:text-gray-300">{t('nav.orders')}</Link>
              <Link to="/account/wishlist" className="block py-1 text-sm text-gray-700 dark:text-gray-300">{t('nav.wishlist')}</Link>
              <Link to="/account/loyalty" className="block py-1 text-sm text-gray-700 dark:text-gray-300">⭐ Loyalty</Link>
              <Link to="/flash-sales" className="block py-1 text-sm text-red-600">⚡ Flash Sales</Link>
              {user?.is_admin && <Link to="/admin" className="block py-1 text-sm text-brand-700">{t('nav.admin')}</Link>}
              <button onClick={logout} className="block py-1 text-sm text-gray-500">{t('nav.signout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-1 text-sm text-gray-700">{t('nav.signin')}</Link>
              <Link to="/register" className="block py-1 text-sm text-brand-700">{t('nav.signup')}</Link>
            </>
          )}
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  )
}
