import { apiClient } from './client'
import type { User, TokenPair } from '@/types'

export const authApi = {
  register: (data: { email: string; password: string; full_name: string; phone?: string }) =>
    apiClient.post<User>('/auth/register', data).then((r) => r.data),

  login: (email: string, password: string) => {
    const form = new FormData()
    form.append('username', email)
    form.append('password', password)
    return apiClient.post<TokenPair>('/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  logout: (refresh_token: string) =>
    apiClient.post('/auth/logout', { refresh_token }).then((r) => r.data),

  refreshTokens: (refresh_token: string) =>
    apiClient.post<TokenPair>('/auth/refresh', { refresh_token }).then((r) => r.data),

  changePassword: (current_password: string, new_password: string) =>
    apiClient.post('/auth/change-password', { current_password, new_password }).then((r) => r.data),
}
