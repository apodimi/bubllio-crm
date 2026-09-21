import { queryOptions, useQuery } from '@tanstack/react-query'
import { companyService } from '../services/companyService'

export const companyKeys = {
  byOrganization: (organizationId: string) =>
    ['organizations', organizationId, 'companies'] as const,
}

const companiesQuery = (organizationId: string) =>
  queryOptions({
    queryKey: companyKeys.byOrganization(organizationId),
    queryFn: ({ signal }) => companyService.list(organizationId, signal),
  })

export const useCompanies = (organizationId: string) => useQuery(companiesQuery(organizationId))
