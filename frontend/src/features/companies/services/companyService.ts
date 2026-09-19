import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'
import type { Company } from '../../../types/company.types'

export const companyService = {
  list: (organizationId: string, signal?: AbortSignal) =>
    request<Company[]>(organizationPath(organizationId) + 'companies/', { signal }),
}
