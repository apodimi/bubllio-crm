import { request, type TokenPair } from '../../../services/api'
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
}
