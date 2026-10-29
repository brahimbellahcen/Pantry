import { apiClient } from './client'
import type { Product, Category, Page } from '@/types'

export interface ProductFilters {
  q?: string
  category?: string
  featured?: boolean
  min_price?: number
  max_price?: number
  sort?: string
  page?: number
  page_size?: number
}

export const productsApi = {
  list: (filters: ProductFilters = {}) =>
    apiClient.get<Page<Product>>('/products', { params: filters }).then((r) => r.data),

  featured: (limit = 8) =>
    apiClient.get<Product[]>('/products/featured', { params: { limit } }).then((r) => r.data),

  get: (slug: string) =>
    apiClient.get<Product>(`/products/${slug}`).then((r) => r.data),

  listCategories: () =>
    apiClient.get<Category[]>('/categories').then((r) => r.data),

  getCategory: (slug: string) =>
    apiClient.get<Category>(`/categories/${slug}`).then((r) => r.data),
}
