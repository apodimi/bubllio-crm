import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  InvitationRegistration,
  InvitationRole,
  WorkspaceRole,
} from '../../../types/invitation.types'
import { invitationService } from '../services/invitationService'

export const invitationKeys = {
  byOrganization: (organizationId: string) =>
    ['organizations', organizationId, 'invitations'] as const,
}

export const useInvitations = (organizationId: string, enabled = true) =>
  useQuery({
    queryKey: invitationKeys.byOrganization(organizationId),
    queryFn: ({ signal }) => invitationService.list(organizationId, signal),
    enabled,
  })

export const useWorkspaceMembers = (organizationId: string) =>
  useQuery({
    queryKey: ['organizations', organizationId, 'members'],
    queryFn: ({ signal }) => invitationService.members(organizationId, signal),
  })

export const useInvitationPreview = (token: string, installationAdmin = false) =>
  useQuery({
    queryKey: ['invitation', installationAdmin, token],
    queryFn: ({ signal }) => invitationService.preview(token, signal, installationAdmin),
    retry: false,
  })

export function useCreateInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: InvitationRole }) =>
      invitationService.create(organizationId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invitationKeys.byOrganization(organizationId) }),
  })
}

export function useInvitationActions(organizationId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: invitationKeys.byOrganization(organizationId) })
  const resend = useMutation({
    mutationFn: (invitationId: string) => invitationService.resend(organizationId, invitationId),
    onSuccess: refresh,
  })
  const revoke = useMutation({
    mutationFn: (invitationId: string) => invitationService.revoke(organizationId, invitationId),
    onSuccess: refresh,
  })
  return { resend, revoke }
}

export function useMemberActions(organizationId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'members'] })
  const update = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: WorkspaceRole }) =>
      invitationService.updateMember(organizationId, memberId, role),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (memberId: string) => invitationService.removeMember(organizationId, memberId),
    onSuccess: refresh,
  })
  return { update, remove }
}

export const useAcceptInvitation = (installationAdmin = false) =>
  useMutation({
    mutationFn: ({ token, input }: { token: string; input?: InvitationRegistration }) =>
      invitationService.accept(token, input, installationAdmin),
  })
