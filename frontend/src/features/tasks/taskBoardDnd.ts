import type { CrmTask, TaskWorkflowStatus } from '../../types/task.types'

const taskWorkflowStatuses: TaskWorkflowStatus[] = ['todo', 'in_progress', 'waiting', 'completed']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTask(value: unknown): value is CrmTask {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.id === 'string' &&
    typeof value.workflow_status === 'string' &&
    taskWorkflowStatuses.includes(value.workflow_status as TaskWorkflowStatus) &&
    typeof value.title === 'string' &&
    typeof value.company_name === 'string' &&
    typeof value.deal_title === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.priority === 'string' &&
    typeof value.effective_status === 'string' &&
    typeof value.due_at === 'string' &&
    typeof value.assigned_to_name === 'string'
  )
}

export function taskFromDragData(data: unknown): CrmTask | undefined {
  if (!isRecord(data) || !isTask(data.task)) {
    return undefined
  }
  return data.task
}

export function taskStatusFromDragData(data: unknown): TaskWorkflowStatus | undefined {
  if (!isRecord(data)) {
    return undefined
  }
  const directStatus = data.workflowStatus
  const nestedStatus = isRecord(data.task) ? data.task.workflow_status : undefined
  const status = directStatus ?? nestedStatus
  if (typeof status !== 'string') {
    return undefined
  }
  return taskWorkflowStatuses.includes(status as TaskWorkflowStatus)
    ? (status as TaskWorkflowStatus)
    : undefined
}
