export type TaskKind = 'task' | 'call' | 'email' | 'meeting'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskStatus = 'open' | 'overdue' | 'completed'
export type TaskWorkflowStatus = 'todo' | 'in_progress' | 'waiting' | 'completed'

export interface CrmTask {
  id: string
  organization: string
  company: string
  company_name: string
  contact: string | null
  contact_name: string
  deal: string | null
  deal_title: string
  assigned_to: number | null
  assigned_to_name: string
  created_by_name: string
  completed_by_name: string
  title: string
  kind: TaskKind
  priority: TaskPriority
  workflow_status: TaskWorkflowStatus
  due_at: string
  reminder_at: string | null
  notes: string
  effective_status: TaskStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type TaskInput = Pick<
  CrmTask,
  | 'company'
  | 'contact'
  | 'deal'
  | 'assigned_to'
  | 'title'
  | 'kind'
  | 'priority'
  | 'due_at'
  | 'reminder_at'
  | 'notes'
>
