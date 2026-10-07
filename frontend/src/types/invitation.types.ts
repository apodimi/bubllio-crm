export const INVITABLE_ROLES = ['admin', 'member', 'viewer'] as const
export type InvitationRole = (typeof INVITABLE_ROLES)[number]

export const WORKSPACE_ROLES = ['owner', ...INVITABLE_ROLES] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const
export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS]

export const INVITATION_ACTION = {
  RESEND: 'resend',
  REVOKE: 'revoke',
} as const
export type InvitationAction = (typeof INVITATION_ACTION)[keyof typeof INVITATION_ACTION]

export interface Invitation {
  id: string
  email: string
  role: WorkspaceRole
  status: InvitationStatus
  invited_by: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export interface WorkspaceMember {
  id: string
  username: string
  email: string
  role: WorkspaceRole
}

export interface InvitationPreview {
  email: string
  organization_name?: string
  role?: WorkspaceRole
  expires_at: string
}

export interface InvitationAcceptance {
  organization_id?: string
  role?: WorkspaceRole
  tokens: { access: string; refresh: string } | null
}

export interface InvitationRegistration {
  username: string
  password: string
  display_name: string
  first_name?: string
  last_name?: string
  date_of_birth?: string | null
}
