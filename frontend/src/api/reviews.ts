import { apiClient } from './client'

export interface ReviewPayload { rating: number; title?: string; body?: string }
export interface ReviewOut {
  id: number; product_id: number; user_id: number; author_name: string
  rating: number; title?: string; body?: string
  is_verified_purchase: boolean; status: string; created_at: string
}
export interface ReviewStats {
  average_rating: number; total_reviews: number
  rating_breakdown: Record<number, number>
}

export const reviewsApi = {
  list: (product_id: number) =>
    apiClient.get<ReviewOut[]>(`/reviews/products/${product_id}`).then(r => r.data),
  stats: (product_id: number) =>
    apiClient.get<ReviewStats>(`/reviews/products/${product_id}/stats`).then(r => r.data),
  submit: (product_id: number, data: ReviewPayload) =>
    apiClient.post<ReviewOut>(`/reviews/products/${product_id}`, data).then(r => r.data),
}
