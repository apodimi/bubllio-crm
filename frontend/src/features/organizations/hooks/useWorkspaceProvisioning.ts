import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { organizationService } from '../services/organizationService'

export const pendingWorkspaceKey = ['workspaces', 'pending'] as const
export const workspaceCreatorsKey = ['workspaces', 'creators'] as const

export function usePendingWorkspaces(enabled: boolean) {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: pendingWorkspaceKey,
    queryFn: ({ signal }) => organizationService.pendingWorkspaces(signal),
    enabled,
  })
  const resend = useMutation({ mutationFn: organizationService.resendOwnerInvitation })
  const cancel = useMutation({
    mutationFn: organizationService.cancelPendingWorkspace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pendingWorkspaceKey }),
  })
  return { list, resend, cancel }
}

export function useWorkspaceCreators(enabled: boolean) {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: workspaceCreatorsKey,
    queryFn: ({ signal }) => organizationService.workspaceCreators(signal),
    enabled,
  })
  const grant = useMutation({
    mutationFn: organizationService.grantWorkspaceCreator,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceCreatorsKey }),
  })
  const revoke = useMutation({
    mutationFn: organizationService.revokeWorkspaceCreator,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceCreatorsKey }),
  })
  return { list, grant, revoke }
}
