export interface BackupEventStatus {
  status: 'unknown' | 'failed' | 'stale' | 'current'
  completed_at: string | null
}

export interface InstallationBackupStatus {
  backup: BackupEventStatus
  restore_test: BackupEventStatus
  backup_max_age_hours: number
  restore_test_max_age_days: number
}
