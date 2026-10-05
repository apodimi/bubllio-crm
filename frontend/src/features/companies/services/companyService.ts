import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'
import type { Company, CompanyInput } from '../../../types/company.types'

export interface CompanyFilters {
  search?: string
  lifecycleStage?: Company['lifecycle_stage'] | ''
}

const companyPath = (organizationId: string, companyId?: string) =>
  organizationPath(organizationId) +
  'companies/' +
  (companyId ? encodeURIComponent(companyId) + '/' : '')

export const companyService = {
  list: (organizationId: string, filters: CompanyFilters = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (filters.search?.trim()) params.set('search', filters.search.trim())
    if (filters.lifecycleStage) params.set('lifecycle_stage', filters.lifecycleStage)
    const query = params.toString()
    return request<Company[]>(companyPath(organizationId) + (query ? `?${query}` : ''), { signal })
  },
  create: (organizationId: string, body: CompanyInput) =>
    request<Company>(companyPath(organizationId), { body }),
  update: (organizationId: string, companyId: string, body: CompanyInput) =>
    request<Company>(companyPath(organizationId, companyId), { method: 'PATCH', body }),
  remove: (organizationId: string, companyId: string) =>
    request<void>(companyPath(organizationId, companyId), { method: 'DELETE' }),
}
