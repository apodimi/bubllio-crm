import { request } from '../../../services/api'
import type { InstallationBackupStatus } from '../../../types/backupStatus.types'

export const backupStatusService = {
  get: (signal?: AbortSignal) =>
    request<InstallationBackupStatus>('/installation/backup-status/', { signal }),
}
