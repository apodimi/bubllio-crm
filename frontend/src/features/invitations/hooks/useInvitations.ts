import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invitationService } from '../services/invitationService'
import type { InvitationRole } from '../services/invitationService'

export const useInvitations = (organizationId: string) => useQuery({
  queryKey: ['organizations', organizationId, 'invitations'],
  queryFn: ({ signal }) => invitationService.list(organizationId, signal),
})

export const useWorkspaceMembers = (organizationId: string) => useQuery({
  queryKey: ['organizations', organizationId, 'members'],
  queryFn: ({ signal }) => invitationService.members(organizationId, signal),
})

export const useInvitationPreview = (token: string) => useQuery({
  queryKey: ['invitation', token],
  queryFn: ({ signal }) => invitationService.preview(token, signal),
  retry: false,
})

export function useCreateInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: InvitationRole }) => invitationService.create(organizationId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'invitations'] }),
  })
}

export const useAcceptInvitation = () => useMutation({
  mutationFn: ({ token, input }: { token: string; input: { username: string; password: string } | Record<string, never> }) =>
    invitationService.accept(token, input),
})
