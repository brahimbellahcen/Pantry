import { apiClient } from './client'
import type { Product, Category, Order, OrderSummary, Page, User } from '@/types'

export const adminApi = {
  // Stats
  getStats: () => apiClient.get('/admin/stats').then((r) => r.data),
  getRevenueSeries: (days = 30) =>
    apiClient.get('/admin/stats/revenue-series', { params: { days } }).then(r => r.data),
  getTopProducts: (limit = 5) =>
    apiClient.get('/admin/stats/top-products', { params: { limit } }).then(r => r.data),
  getCustomerGrowth: (days = 30) =>
    apiClient.get('/admin/stats/customer-growth', { params: { days } }).then(r => r.data),

  // Products
  listProducts: (include_inactive = false) =>
    apiClient.get<Product[]>('/admin/products', { params: { include_inactive } }).then((r) => r.data),

  createProduct: (data: Partial<Product> & { initial_stock?: number }) =>
    apiClient.post<Product>('/admin/products', data).then((r) => r.data),

  updateProduct: (id: number, data: Partial<Product>) =>
    apiClient.patch<Product>(`/admin/products/${id}`, data).then((r) => r.data),

  deleteProduct: (id: number) => apiClient.delete(`/admin/products/${id}`),

  updateInventory: (product_id: number, data: { quantity?: number; low_stock_threshold?: number }) =>
    apiClient.patch(`/admin/products/${product_id}/inventory`, data).then((r) => r.data),

  // Categories
  listCategories: () =>
    apiClient.get<Category[]>('/admin/categories').then((r) => r.data),

  createCategory: (data: Partial<Category>) =>
    apiClient.post<Category>('/admin/categories', data).then((r) => r.data),

  updateCategory: (id: number, data: Partial<Category>) =>
    apiClient.patch<Category>(`/admin/categories/${id}`, data).then((r) => r.data),

  // Orders
  listOrders: (page = 1, page_size = 20, status?: string) =>
    apiClient.get<Page<OrderSummary>>('/admin/orders', { params: { page, page_size, status } }).then((r) => r.data),

  getOrder: (id: number) =>
    apiClient.get<Order>(`/admin/orders/${id}`).then((r) => r.data),

  updateOrderStatus: (id: number, status: string) =>
    apiClient.patch<Order>(`/admin/orders/${id}/status`, { status }).then((r) => r.data),

  // Users
  listUsers: () => apiClient.get<User[]>('/admin/users').then((r) => r.data),

  // Coupons
  listCoupons: () => apiClient.get('/admin/coupons').then(r => r.data),
  createCoupon: (data: any) => apiClient.post('/admin/coupons', data).then(r => r.data),
  updateCoupon: (id: number, data: any) => apiClient.patch(`/admin/coupons/${id}`, data).then(r => r.data),

  // Reviews
  listReviews: (status = 'pending') =>
    apiClient.get('/admin/reviews', { params: { status } }).then(r => r.data),
  moderateReview: (id: number, action: string) =>
    apiClient.patch(`/admin/reviews/${id}/moderate`, null, { params: { action } }).then(r => r.data),

  // Delivery Slots
  listSlots: () => apiClient.get('/admin/delivery-slots').then(r => r.data),
  createSlot: (data: any) => apiClient.post('/admin/delivery-slots', data).then(r => r.data),
  // Returns
  listReturns: (status = 'pending') =>
    apiClient.get('/admin/returns', { params: { status } }).then(r => r.data),
  resolveReturn: (id: number, status: string, resolution_note?: string) =>
    apiClient.patch(`/admin/returns/${id}/resolve`, { status, resolution_note }).then(r => r.data),
}
