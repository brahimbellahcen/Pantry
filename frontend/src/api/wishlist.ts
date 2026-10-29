import { apiClient } from './client'
import type { Product } from '@/types'

export const wishlistApi = {
  get: () => apiClient.get<Product[]>('/wishlist').then(r => r.data),
  add: (product_id: number) => apiClient.post(`/wishlist/${product_id}`).then(r => r.data),
  remove: (product_id: number) => apiClient.delete(`/wishlist/${product_id}`).then(r => r.data),
}
