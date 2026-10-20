import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'
import type {
  Company,
  CompanyActivity,
  CompanyAttentionItem,
  CompanyAssignee,
  CompanyInput,
  CompanyCommunicationInput,
  CompanyTimelineCategory,
  CompanyTimelineEvent,
} from '../../../types/company.types'
import type { PageResult } from '../../../types/pagination.types'
import type { CrmSummary } from '../../../types/crm-summary.types'

export interface CompanyFilters {
  search?: string
  lifecycleStage?: Company['lifecycle_stage'] | ''
  archived?: 'active' | 'archived' | 'all'
  assignedTo?: number | 'unassigned' | ''
  ordering?: CompanyOrdering
}

export type CompanyOrdering =
  | 'name'
  | '-name'
  | 'updated_at'
  | '-updated_at'
  | 'created_at'
  | '-created_at'
  | 'lifecycle_stage'
  | '-lifecycle_stage'

const companyPath = (organizationId: string, companyId?: string) =>
  organizationPath(organizationId) +
  'companies/' +
  (companyId ? encodeURIComponent(companyId) + '/' : '')

export const companyService = {
  summary: (organizationId: string, signal?: AbortSignal) =>
    request<CrmSummary>(companyPath(organizationId) + 'summary/', { signal }),
  attention: (organizationId: string, signal?: AbortSignal) =>
    request<CompanyAttentionItem[]>(companyPath(organizationId) + 'attention/', { signal }),
  page: (organizationId: string, filters: CompanyFilters, page: number, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page + 1), page_size: '50' })
    if (filters.search?.trim()) params.set('search', filters.search.trim())
    if (filters.lifecycleStage) params.set('lifecycle_stage', filters.lifecycleStage)
    if (filters.archived) params.set('archived', filters.archived)
    if (filters.assignedTo) params.set('assigned_to', String(filters.assignedTo))
    if (filters.ordering) params.set('ordering', filters.ordering)
    return request<PageResult<Company>>(companyPath(organizationId) + '?' + params, { signal })
  },
  list: (organizationId: string, filters: CompanyFilters = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (filters.search?.trim()) params.set('search', filters.search.trim())
    if (filters.lifecycleStage) params.set('lifecycle_stage', filters.lifecycleStage)
    if (filters.archived) params.set('archived', filters.archived)
    if (filters.assignedTo) params.set('assigned_to', String(filters.assignedTo))
    if (filters.ordering) params.set('ordering', filters.ordering)
    const query = params.toString()
    return request<Company[]>(companyPath(organizationId) + (query ? `?${query}` : ''), { signal })
  },
  get: (organizationId: string, companyId: string, signal?: AbortSignal) =>
    request<Company>(companyPath(organizationId, companyId), { signal }),
  create: (organizationId: string, body: CompanyInput) =>
    request<Company>(companyPath(organizationId), { body }),
  update: (organizationId: string, companyId: string, body: Partial<CompanyInput>) =>
    request<Company>(companyPath(organizationId, companyId), { method: 'PATCH', body }),
  remove: (organizationId: string, companyId: string) =>
    request<void>(companyPath(organizationId, companyId), { method: 'DELETE' }),
  activity: (organizationId: string, companyId: string, signal?: AbortSignal) =>
    request<CompanyActivity[]>(`${companyPath(organizationId, companyId)}activity/`, { signal }),
  timeline: (
    organizationId: string,
    companyId: string,
    page: number,
    category?: CompanyTimelineCategory,
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({ page: String(page), page_size: '25' })
    if (category) params.set('category', category)
    return request<PageResult<CompanyTimelineEvent>>(
      `${companyPath(organizationId, companyId)}timeline/?${params}`,
      { signal },
    )
  },
  addTimelineNote: (organizationId: string, companyId: string, body: string) =>
    request<CompanyTimelineEvent>(`${companyPath(organizationId, companyId)}timeline/`, {
      body: { body },
    }),
  addCommunication: (organizationId: string, companyId: string, body: CompanyCommunicationInput) =>
    request<CompanyTimelineEvent>(`${companyPath(organizationId, companyId)}timeline/`, { body }),
  archive: (organizationId: string, companyId: string) =>
    request<Company>(`${companyPath(organizationId, companyId)}archive/`, { body: {} }),
  restore: (organizationId: string, companyId: string) =>
    request<Company>(`${companyPath(organizationId, companyId)}restore/`, { body: {} }),
  assignees: (organizationId: string, signal?: AbortSignal) =>
    request<CompanyAssignee[]>(`${companyPath(organizationId)}assignees/`, { signal }),
}
