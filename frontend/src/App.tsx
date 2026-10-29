import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/Badge'

const Home = lazy(() => import('@/pages/Home'))
const Products = lazy(() => import('@/pages/Products'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail'))
const Cart = lazy(() => import('@/pages/Cart'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const CheckoutSuccess = lazy(() => import('@/pages/CheckoutSuccess'))
const OrderHistory = lazy(() => import('@/pages/OrderHistory'))
const OrderDetail = lazy(() => import('@/pages/OrderDetail'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Wishlist = lazy(() => import('@/pages/Wishlist'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminProducts = lazy(() => import('@/pages/admin/Products'))
const AdminCategories = lazy(() => import('@/pages/admin/Categories'))
const AdminOrders = lazy(() => import('@/pages/admin/Orders'))
const AdminInventory = lazy(() => import('@/pages/admin/Inventory'))

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Storefront */}
      <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
      <Route path="/products" element={<StorefrontLayout><Products /></StorefrontLayout>} />
      <Route path="/products/:slug" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
      <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />
      <Route path="/login" element={<StorefrontLayout><Login /></StorefrontLayout>} />
      <Route path="/register" element={<StorefrontLayout><Register /></StorefrontLayout>} />

      {/* Authenticated routes */}
      <Route path="/checkout" element={<StorefrontLayout><RequireAuth><Checkout /></RequireAuth></StorefrontLayout>} />
      <Route path="/checkout/success" element={<StorefrontLayout><CheckoutSuccess /></StorefrontLayout>} />
      <Route path="/account/orders" element={<StorefrontLayout><RequireAuth><OrderHistory /></RequireAuth></StorefrontLayout>} />
      <Route path="/account/orders/:id" element={<StorefrontLayout><RequireAuth><OrderDetail /></RequireAuth></StorefrontLayout>} />
      <Route path="/account/wishlist" element={<StorefrontLayout><RequireAuth><Wishlist /></RequireAuth></StorefrontLayout>} />

      {/* Admin */}
      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
      <Route path="/admin/categories" element={<AdminLayout><AdminCategories /></AdminLayout>} />
      <Route path="/admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
      <Route path="/admin/inventory" element={<AdminLayout><AdminInventory /></AdminLayout>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
