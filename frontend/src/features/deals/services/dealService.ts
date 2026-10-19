import { request } from '../../../services/api'
import { organizationPath } from '../../organizations'
import type { Deal, DealInput } from '../../../types/deal.types'

export interface DealFilters {
  search?: string
  stage?: Deal['stage'] | ''
  archived?: 'active' | 'archived' | 'all'
  assignedTo?: 'me' | 'unassigned'
  nextAction?: 'missing' | 'present'
  expectedCloseFrom?: string
  expectedCloseTo?: string
  limit?: number
}

const path = (org: string, id?: string) =>
  `${organizationPath(org)}deals/${id ? `${encodeURIComponent(id)}/` : ''}`
export const dealService = {
  list: (org: string, filters: DealFilters = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (filters.search?.trim()) {
      params.set('search', filters.search.trim())
    }
    if (filters.stage) {
      params.set('stage', filters.stage)
    }
    if (filters.archived) {
      params.set('archived', filters.archived)
    }
    if (filters.assignedTo) params.set('assigned_to', filters.assignedTo)
    if (filters.nextAction) params.set('next_action', filters.nextAction)
    if (filters.expectedCloseFrom) params.set('expected_close_from', filters.expectedCloseFrom)
    if (filters.expectedCloseTo) params.set('expected_close_to', filters.expectedCloseTo)
    if (filters.limit) params.set('limit', String(filters.limit))
    const query = params.toString()
    return request<Deal[]>(path(org) + (query ? `?${query}` : ''), { signal })
  },
  get: (org: string, id: string, signal?: AbortSignal) => request<Deal>(path(org, id), { signal }),
  create: (org: string, body: DealInput) => request<Deal>(path(org), { method: 'POST', body }),
  update: (org: string, id: string, body: Partial<Deal>) =>
    request<Deal>(path(org, id), { method: 'PATCH', body }),
  move: (org: string, id: string, stage: Deal['stage'], position: number) =>
    request<Deal>(`${path(org, id)}move/`, { method: 'POST', body: { stage, position } }),
  archive: (org: string, id: string) =>
    request<Deal>(`${path(org, id)}archive/`, { method: 'POST' }),
  remove: (org: string, id: string) => request<void>(path(org, id), { method: 'DELETE' }),
}
