import { apiClient } from './client'
import type { Cart } from '@/types'

export const cartApi = {
  get: () => apiClient.get<Cart>('/cart').then((r) => r.data),
  addItem: (product_id: number, quantity: number) =>
    apiClient.post<Cart>('/cart/items', { product_id, quantity }).then((r) => r.data),
  updateItem: (item_id: number, quantity: number) =>
    apiClient.patch<Cart>(`/cart/items/${item_id}`, { quantity }).then((r) => r.data),
  removeItem: (item_id: number) =>
    apiClient.delete(`/cart/items/${item_id}`).then((r) => r.data),
  clear: () => apiClient.delete('/cart').then((r) => r.data),
}
