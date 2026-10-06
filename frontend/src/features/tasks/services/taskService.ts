import { request } from '../../../services/api'
import { organizationPath } from '../../organizations'
import type { CrmTask, TaskInput, TaskKind } from '../../../types/task.types'

export type TaskBucket = 'today' | 'upcoming' | 'overdue' | 'open' | 'completed' | 'all'
export interface TaskFilters {
  bucket?: TaskBucket
  assignedTo?: number | 'me' | 'unassigned' | ''
  company?: string
  contact?: string
  deal?: string
  kind?: TaskKind | ''
}

const taskPath = (organizationId: string, taskId?: string) =>
  `${organizationPath(organizationId)}tasks/${taskId ? `${encodeURIComponent(taskId)}/` : ''}`

export const taskService = {
  list: (organizationId: string, filters: TaskFilters = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (filters.bucket) params.set('bucket', filters.bucket)
    if (filters.assignedTo) params.set('assigned_to', String(filters.assignedTo))
    if (filters.company) params.set('company', filters.company)
    if (filters.contact) params.set('contact', filters.contact)
    if (filters.deal) params.set('deal', filters.deal)
    if (filters.kind) params.set('kind', filters.kind)
    const query = params.toString()
    return request<CrmTask[]>(`${taskPath(organizationId)}${query ? `?${query}` : ''}`, {
      signal,
    })
  },
  create: (organizationId: string, body: TaskInput) =>
    request<CrmTask>(taskPath(organizationId), { body }),
  update: (organizationId: string, taskId: string, body: Partial<TaskInput>) =>
    request<CrmTask>(taskPath(organizationId, taskId), { method: 'PATCH', body }),
  remove: (organizationId: string, taskId: string) =>
    request<void>(taskPath(organizationId, taskId), { method: 'DELETE' }),
  complete: (organizationId: string, taskId: string) =>
    request<CrmTask>(`${taskPath(organizationId, taskId)}complete/`, { body: {} }),
  reopen: (organizationId: string, taskId: string) =>
    request<CrmTask>(`${taskPath(organizationId, taskId)}reopen/`, { body: {} }),
}
