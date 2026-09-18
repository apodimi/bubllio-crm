export interface Organization {
  id: string; name: string; slug: string
  current_user_role: 'owner' | 'admin' | 'member' | 'viewer' | null
}
export interface Company {
  id: string; organization: string; name: string; email: string
  phone_number: string; website: string
  lifecycle_stage: 'lead' | 'prospect' | 'customer' | 'inactive'
}
export interface Contact {
  id: string; organization: string; company: string; first_name: string
  last_name: string; email: string; phone_number: string; department: string; job_title: string
}
export interface Automation {
  id: string; name: string; trigger: string; action_type: string; is_active: boolean
}
export interface AutomationRun {
  id: string; automation: string; trigger: string; status: 'success' | 'failed' | 'skipped'
  created_at: string; error_message: string
}
