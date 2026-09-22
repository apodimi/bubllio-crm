import { request } from '../../../services/api'
import type { Organization } from '../../../types/organization.types'

export const organizationPath = (id: string) => '/organizations/' + encodeURIComponent(id) + '/'

export const organizationService = {
  list: (signal?: AbortSignal) => request<Organization[]>('/organizations/', { signal }),
  get: (id: string, signal?: AbortSignal) =>
    request<Organization>(organizationPath(id), { signal }),
  settings: (id: string, signal?: AbortSignal) =>
    request<{ timezone: string; locale: string; default_from_name: string }>(
      `${organizationPath(id)}settings/`,
      { signal },
    ),
  patchSettings: (
    id: string,
    body: { timezone?: string; locale?: string; default_from_name?: string },
  ) => request(`${organizationPath(id)}settings/`, { body }),
  emailAccounts: (id: string, signal?: AbortSignal) =>
    request<
      Array<{
        id: string
        name: string
        host: string
        port: number
        username: string
        from_email: string
        is_default: boolean
        is_active: boolean
      }>
    >(`${organizationPath(id)}email-accounts/`, { signal }),
  createEmailAccount: (id: string, body: Record<string, unknown>) =>
    request(`${organizationPath(id)}email-accounts/`, { body }),
  updateEmailAccount: (id: string, accountId: string, body: Record<string, unknown>) =>
    request(`${organizationPath(id)}email-accounts/${encodeURIComponent(accountId)}/`, {
      method: 'PATCH',
      body,
    }),
  installationSettings: (signal?: AbortSignal) =>
    request<{
      configured: boolean
      smtp: {
        id: string
        name: string
        host: string
        port: number
        username: string
        from_email: string
        is_default: boolean
        is_active: boolean
      } | null
    }>('/organizations/installation-settings/', { signal }),
  patchInstallationSettings: (body: Record<string, unknown>) =>
    request('/organizations/installation-settings/', { method: 'PATCH', body }),
}
