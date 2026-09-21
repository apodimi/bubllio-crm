import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'

export type InvitationRole = 'admin' | 'member' | 'viewer'
export type Invitation = { id: string; email: string; role: InvitationRole; expires_at: string }
export type WorkspaceMember = {
  id: string
  username: string
  email: string
  role: InvitationRole | 'owner'
}
export type InvitationPreview = {
  email: string
  organization_name: string
  role: InvitationRole
  expires_at: string
}
export type InvitationAcceptance = {
  organization_id: string
  role: InvitationRole
  tokens: { access: string; refresh: string } | null
}

const invitationPath = (token: string) => `/invitations/${encodeURIComponent(token)}/`

export const invitationService = {
  list: (organizationId: string, signal?: AbortSignal) =>
    request<Invitation[]>(`${organizationPath(organizationId)}invitations/`, { signal }),
  members: (organizationId: string, signal?: AbortSignal) =>
    request<WorkspaceMember[]>(`${organizationPath(organizationId)}members/`, { signal }),
  create: (organizationId: string, input: { email: string; role: InvitationRole }) =>
    request<Invitation>(`${organizationPath(organizationId)}invitations/`, { body: input }),
  preview: (token: string, signal?: AbortSignal) =>
    request<InvitationPreview>(invitationPath(token), { signal }),
  accept: (token: string, input: { username: string; password: string } | Record<string, never>) =>
    request<InvitationAcceptance>(`${invitationPath(token)}accept/`, { body: input }),
}
