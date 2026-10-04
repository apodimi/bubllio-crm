import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invitationService } from '../services/invitationService'
import type { InvitationRegistration, InvitationRole } from '../services/invitationService'

export const useInvitations = (organizationId: string) =>
  useQuery({
    queryKey: ['organizations', organizationId, 'invitations'],
    queryFn: ({ signal }) => invitationService.list(organizationId, signal),
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
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'invitations'] }),
  })
}

export function useMemberActions(organizationId: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'members'] })
  const update = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: InvitationRole | 'owner' }) => invitationService.updateMember(organizationId, memberId, role),
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
