import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { organizationService } from '../services/organizationService'

export function useInstallationAdministrators(enabled: boolean) {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ['installation-administrators'],
    queryFn: ({ signal }) => organizationService.installationAdministrators(signal),
    enabled,
  })
  const invite = useMutation({
    mutationFn: organizationService.inviteInstallationAdministrator,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installation-administrators'] }),
  })
  return { list, invite }
}
