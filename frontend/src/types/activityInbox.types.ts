export type ActivityInboxKind =
  | 'overdue_task'
  | 'task_due_today'
  | 'deal_without_next_action'
  | 'company_without_follow_up'
  | 'overdue_charges'
  | 'renewals_due'
  | 'pending_invitations'

export type ActivityInboxSeverity = 'critical' | 'warning' | 'info'

export interface ActivityInboxItem {
  id: string
  kind: ActivityInboxKind
  severity: ActivityInboxSeverity
  title: string
  description: string
  entity: { type: 'task' | 'deal' | 'company' | 'billing' | 'members'; id: string | null }
  due_at: string | null
  action: { kind: 'navigate'; path: string }
}

export interface ActivityInboxResponse {
  count: number
  items: ActivityInboxItem[]
}
