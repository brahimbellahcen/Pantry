import { apiClient } from './client'
import type { Order, OrderSummary, Page, CheckoutResponse } from '@/types'

export interface CheckoutPayload {
  shipping_address_id?: number
  shipping_address?: {
    line1: string; line2?: string; city: string; state?: string
    postal_code: string; country?: string
  }
  billing_same_as_shipping?: boolean
  notes?: string
  payment_method?: string
}

export const ordersApi = {
  checkout: (payload: CheckoutPayload) =>
    apiClient.post<CheckoutResponse>('/orders/checkout', payload).then((r) => r.data),

  list: (page = 1, page_size = 10) =>
    apiClient.get<Page<OrderSummary>>('/orders', { params: { page, page_size } }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),
}
