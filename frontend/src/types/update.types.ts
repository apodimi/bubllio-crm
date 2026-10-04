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
