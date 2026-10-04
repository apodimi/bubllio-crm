import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'
import type { Company, CompanyInput } from '../../../types/company.types'

const companyPath = (organizationId: string, companyId?: string) =>
  organizationPath(organizationId) +
  'companies/' +
  (companyId ? encodeURIComponent(companyId) + '/' : '')

export const companyService = {
  list: (organizationId: string, signal?: AbortSignal) =>
    request<Company[]>(companyPath(organizationId), { signal }),
  create: (organizationId: string, body: CompanyInput) =>
    request<Company>(companyPath(organizationId), { body }),
  update: (organizationId: string, companyId: string, body: CompanyInput) =>
    request<Company>(companyPath(organizationId, companyId), { method: 'PATCH', body }),
  remove: (organizationId: string, companyId: string) =>
    request<void>(companyPath(organizationId, companyId), { method: 'DELETE' }),
}
