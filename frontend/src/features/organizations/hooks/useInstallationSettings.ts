import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { organizationService } from '../services/organizationService'

export function useInstallationSettings(enabled = true) {
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['installation-settings'],
    queryFn: ({ signal }) => organizationService.installationSettings(signal),
    enabled,
  })
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      organizationService.patchInstallationSettings(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installation-settings'] }),
  })
  return { settings, save }
}
