import { apiClient, request } from '../../../services/api'
import type {
  EmailAccount,
  Organization,
  WorkspaceActivityEvent,
  WorkspaceSettings,
} from '../../../types/organization.types'

export const organizationPath = (id: string) => '/organizations/' + encodeURIComponent(id) + '/'

export const organizationService = {
  list: (signal?: AbortSignal) => request<Organization[]>('/organizations/', { signal }),
  createPersonal: () => request<Organization>('/organizations/personal/', { body: {} }),
  personalPolicy: (signal?: AbortSignal) =>
    request<{ allowed: boolean; exists: boolean }>('/organizations/personal/', { signal }),
  installationAdministrators: (signal?: AbortSignal) =>
    request<{
      administrators: Array<{ id: number; username: string; email: string }>
      invitations: Array<{ id: string; email: string; expires_at: string }>
    }>('/organizations/installation-admin-invitations/', { signal }),
  inviteInstallationAdministrator: (email: string) =>
    request('/organizations/installation-admin-invitations/', { body: { email } }),
  workspaceCreators: (signal?: AbortSignal) =>
    request<
      Array<{ id: string; user_id: number; username: string; email: string; granted_at: string }>
    >('/organizations/workspace-creators/', { signal }),
  grantWorkspaceCreator: (email: string) =>
    request('/organizations/workspace-creators/', { body: { email } }),
  revokeWorkspaceCreator: (grantId: string) =>
    request(`/organizations/workspace-creators/${encodeURIComponent(grantId)}/`, {
      method: 'DELETE',
    }),
  pendingWorkspaces: (signal?: AbortSignal) =>
    request<
      Array<{
        organization_id: string
        name: string
        slug: string
        owner_email: string
        created_at: string
      }>
    >('/organizations/provisioning/', { signal }),
  resendOwnerInvitation: (id: string) =>
    request(`/organizations/provisioning/${encodeURIComponent(id)}/`, { body: {} }),
  cancelPendingWorkspace: (id: string) =>
    request(`/organizations/provisioning/${encodeURIComponent(id)}/`, { method: 'DELETE' }),
  get: (id: string, signal?: AbortSignal) =>
    request<Organization>(organizationPath(id), { signal }),
  remove: (id: string) => request<void>(organizationPath(id), { method: 'DELETE' }),
  settings: (id: string, signal?: AbortSignal) =>
    request<WorkspaceSettings>(`${organizationPath(id)}settings/`, { signal }),
  settingsOptions: (signal?: AbortSignal) =>
    request<{
      timezones: Array<{ value: string; label: string }>
      locales: Array<{ value: string; label: string }>
    }>('/organizations/settings/options/', { signal }),
  patchSettings: (id: string, body: Partial<WorkspaceSettings>) =>
    request<WorkspaceSettings>(`${organizationPath(id)}settings/`, { method: 'PATCH', body }),
  emailAccounts: (id: string, signal?: AbortSignal) =>
    request<EmailAccount[]>(`${organizationPath(id)}email-accounts/`, { signal }),
  createEmailAccount: (id: string, body: Record<string, unknown>) =>
    request(`${organizationPath(id)}email-accounts/`, { body }),
  updateEmailAccount: (id: string, accountId: string, body: Record<string, unknown>) =>
    request(`${organizationPath(id)}email-accounts/${encodeURIComponent(accountId)}/`, {
      method: 'PATCH',
      body,
    }),
  deleteEmailAccount: (id: string, accountId: string) =>
    request<void>(`${organizationPath(id)}email-accounts/${encodeURIComponent(accountId)}/`, {
      method: 'DELETE',
    }),
  testEmailAccount: (id: string, accountId: string, recipient: string) =>
    request<{ detail: string; status: 'success' }>(
      `${organizationPath(id)}email-accounts/${encodeURIComponent(accountId)}/test/`,
      { body: { recipient } },
    ),
  activity: (id: string, signal?: AbortSignal) =>
    request<WorkspaceActivityEvent[]>(`${organizationPath(id)}activity/`, { signal }),
  downloadExport: (id: string) =>
    apiClient.get<Blob>(`${organizationPath(id)}data-export/`, { responseType: 'blob' }),
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
      allow_personal_workspaces: boolean
    }>('/organizations/installation-settings/', { signal }),
  patchInstallationSettings: (body: Record<string, unknown>) =>
    request('/organizations/installation-settings/', { method: 'PATCH', body }),
}
