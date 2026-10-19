export interface InstallationUpdateStatus {
  status: 'ok' | 'unavailable' | 'disabled'
  enabled: boolean
  current_version: string
  latest_version: string | null
  update_available: boolean
  release_name: string | null
  release_url: string | null
  published_at: string | null
}

export type UpdateMigrationPolicy = 'online_safe' | 'maintenance' | 'irreversible'

export type UpdateRunStatus =
  | 'requested'
  | 'preflight'
  | 'backing_up'
  | 'deploying'
  | 'verifying'
  | 'succeeded'
  | 'failed'
  | 'rolled_back'
  | 'manual_intervention'

export interface UpdateCheck {
  key: string
  status: 'pass' | 'warning' | 'fail'
  label: string
  guidance: string
}

export interface UpdateRunEvent {
  id: number
  action: string
  actor: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface InstallationUpdateRun {
  id: string
  target_version: string
  status: UpdateRunStatus
  progress: number
  phase_label: string
  migration_policy: UpdateMigrationPolicy
  failure_code: string | null
  failure_message: string | null
  requested_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
  events: UpdateRunEvent[]
  agent_connected?: boolean
  state_fresh?: boolean
}

export interface UpdateManifestSummary {
  version?: string
  release_url?: string
  commit_sha?: string
  [key: string]: unknown
}

export interface InstallationUpdatePreflight {
  target_version: string
  eligible: boolean
  checks: UpdateCheck[]
  migration_policy: UpdateMigrationPolicy
  manifest: UpdateManifestSummary
}

export interface InstallationUpdateCenterStatus {
  enabled: boolean
  connected: boolean
  current_version: string
  latest_version: string | null
  update_available: boolean
  release_name: string | null
  release_url: string | null
  published_at: string | null
  active_run: InstallationUpdateRun | null
  latest_run: InstallationUpdateRun | null
  preflight: InstallationUpdatePreflight | null
}
