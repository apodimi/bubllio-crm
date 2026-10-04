import { useQuery } from '@tanstack/react-query'
import { productionReadinessService } from '../services/productionReadinessService'

export function useProductionReadiness(enabled: boolean) {
  return useQuery({
    queryKey: ['installation-production-readiness'],
    queryFn: ({ signal }) => productionReadinessService.get(signal),
    enabled,
    retry: false,
  })
}
