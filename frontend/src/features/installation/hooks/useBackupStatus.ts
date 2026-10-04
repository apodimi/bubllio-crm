import { useQuery } from '@tanstack/react-query'
import { backupStatusService } from '../services/backupStatusService'

export function useBackupStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['installation-backup-status'],
    queryFn: ({ signal }) => backupStatusService.get(signal),
    enabled,
    retry: false,
  })
}
