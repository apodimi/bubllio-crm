import { useQuery } from '@tanstack/react-query'
import { installationAuditService } from '../services/installationAuditService'

export function useInstallationAuditLog(enabled: boolean) {
  return useQuery({
    queryKey: ['installation-audit-log'],
    queryFn: ({ signal }) => installationAuditService.list(signal),
    enabled,
    retry: false,
  })
}
