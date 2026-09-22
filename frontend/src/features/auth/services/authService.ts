import { apiClient, request, type TokenPair } from '../../../services/api'
import type { Organization } from '../../../types/organization.types'

export interface CurrentUser {
  id: number
  username: string
  email: string
  is_superuser: boolean
  organizations: Organization[]
}

export const authService = {
  login: (username: string, password: string) =>
    request<TokenPair>('/auth/token/', { body: { username, password } }),
  currentUser: () => request<CurrentUser>('/auth/me/'),
  logout: (refresh: string) => request('/auth/logout/', { body: { refresh } }),
  accountSettings: (signal?: AbortSignal) =>
    request<{
      username: string
      email: string
      display_name: string
      first_name: string
      last_name: string
      date_of_birth: string | null
      timezone: string
      locale: string
      marketing_consent: boolean
    }>('/auth/me/settings/', { signal }),
  patchAccountSettings: (body: Record<string, unknown>) =>
    request('/auth/me/settings/', { method: 'PATCH', body }),
  changePassword: (body: { current_password: string; new_password: string }) =>
    request('/auth/me/password/', { body }),
  requestPasswordReset: (email: string) => request('/auth/password-reset/', { body: { email } }),
  confirmPasswordReset: (uid: string, token: string, new_password: string) =>
    request(`/auth/password-reset/${encodeURIComponent(uid)}/${encodeURIComponent(token)}/`, {
      body: { new_password },
    }),
  exportAccount: () => apiClient.get<Blob>('/auth/me/export/', { responseType: 'blob' }),
  deleteAccount: (body: { password: string; confirmation: string }) =>
    request('/auth/me/delete/', { body }),
}
