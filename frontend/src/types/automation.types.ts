export interface Automation {
  id: string
  name: string
  trigger: string
  action_type: string
  is_active: boolean
}

export interface AutomationRun {
  id: string
  automation: string
  trigger: string
  status: 'success' | 'failed' | 'skipped'
  created_at: string
  error_message: string
}
