import { useQuery } from '@tanstack/react-query'
import { systemInformationService } from '../services/systemInformationService'

export function useSystemInformation(enabled: boolean) {
  return useQuery({
    queryKey: ['installation-system-information'],
    queryFn: ({ signal }) => systemInformationService.get(signal),
    enabled,
    retry: false,
  })
}
