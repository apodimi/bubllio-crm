import { useQuery } from '@tanstack/react-query'
import { updateService } from '../services/updateService'

const SIX_HOURS = 6 * 60 * 60 * 1000

export function useUpdateStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['installation-update-status'],
    queryFn: ({ signal }) => updateService.status(signal),
    enabled,
    retry: false,
    staleTime: SIX_HOURS,
  })
}
