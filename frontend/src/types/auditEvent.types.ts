export interface InstallationAuditEvent {
  id: number
  action: string
  actor: string
  target: string | null
  organization_id: string | null
  details: Record<string, unknown>
  created_at: string
}
