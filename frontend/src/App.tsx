import { Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/Badge'

import Home from '@/pages/Home'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import OrderHistory from '@/pages/OrderHistory'
import OrderDetail from '@/pages/OrderDetail'
import Login from '@/pages/Login'
import Register from '@/pages/Register'

import AdminDashboard from '@/pages/admin/Dashboard'
import AdminProducts from '@/pages/admin/Products'
import AdminCategories from '@/pages/admin/Categories'
import AdminOrders from '@/pages/admin/Orders'
import AdminInventory from '@/pages/admin/Inventory'

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
      <main className="flex-1">{children}</main>
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
      <Route path="/account/orders" element={<StorefrontLayout><RequireAuth><OrderHistory /></RequireAuth></StorefrontLayout>} />
      <Route path="/account/orders/:id" element={<StorefrontLayout><RequireAuth><OrderDetail /></RequireAuth></StorefrontLayout>} />

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
