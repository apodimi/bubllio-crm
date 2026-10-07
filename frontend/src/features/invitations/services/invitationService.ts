import { request } from '../../../services/api'
import type {
  Invitation,
  InvitationAcceptance,
  InvitationRegistration,
  InvitationRole,
  WorkspaceMember,
  WorkspaceRole,
  InvitationPreview,
} from '../../../types/invitation.types'
import { organizationPath } from '../../organizations/services/organizationService'

const invitationPath = (token: string) => `/invitations/${encodeURIComponent(token)}/`
const adminInvitationPath = (token: string) =>
  `/installation-admin-invitations/${encodeURIComponent(token)}/`

export const invitationService = {
  list: (organizationId: string, signal?: AbortSignal) =>
    request<Invitation[]>(`${organizationPath(organizationId)}invitations/`, { signal }),
  members: (organizationId: string, signal?: AbortSignal) =>
    request<WorkspaceMember[]>(`${organizationPath(organizationId)}members/`, { signal }),
  create: (organizationId: string, input: { email: string; role: InvitationRole }) =>
    request<Invitation>(`${organizationPath(organizationId)}invitations/`, { body: input }),
  resend: (organizationId: string, invitationId: string) =>
    request<Invitation>(
      `${organizationPath(organizationId)}invitations/${encodeURIComponent(invitationId)}/resend/`,
      { body: {} },
    ),
  revoke: (organizationId: string, invitationId: string) =>
    request<void>(
      `${organizationPath(organizationId)}invitations/${encodeURIComponent(invitationId)}/`,
      { method: 'DELETE' },
    ),
  updateMember: (organizationId: string, memberId: string, role: WorkspaceRole) =>
    request<WorkspaceMember>(
      `${organizationPath(organizationId)}members/${encodeURIComponent(memberId)}/`,
      { method: 'PATCH', body: { role } },
    ),
  removeMember: (organizationId: string, memberId: string) =>
    request<void>(`${organizationPath(organizationId)}members/${encodeURIComponent(memberId)}/`, {
      method: 'DELETE',
    }),
  preview: (token: string, signal?: AbortSignal, installationAdmin = false) =>
    request<InvitationPreview>(
      installationAdmin ? adminInvitationPath(token) : invitationPath(token),
      {
        signal,
      },
    ),
  accept: (token: string, input: InvitationRegistration | undefined, installationAdmin = false) =>
    request<InvitationAcceptance>(
      `${installationAdmin ? adminInvitationPath(token) : invitationPath(token)}accept/`,
      { body: input ?? {} },
    ),
}
