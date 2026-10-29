import { apiClient } from './client'

export interface DeliverySlot {
  id: number; date: string; time_window: string
  capacity: number; booked_count: number; available: number; is_active: boolean
}

export const slotsApi = {
  list: () => apiClient.get<DeliverySlot[]>('/delivery-slots').then(r => r.data),
}
