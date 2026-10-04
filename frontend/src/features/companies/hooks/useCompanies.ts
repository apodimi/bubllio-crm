import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CompanyInput } from '../../../types/company.types'
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

const useCompanyMutation = (organizationId: string) => {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: companyKeys.byOrganization(organizationId) })
}

export const useCreateCompany = (organizationId: string) => {
  const invalidate = useCompanyMutation(organizationId)
  return useMutation({
    mutationFn: (body: CompanyInput) => companyService.create(organizationId, body),
    onSuccess: invalidate,
  })
}

export const useUpdateCompany = (organizationId: string, companyId: string) => {
  const invalidate = useCompanyMutation(organizationId)
  return useMutation({
    mutationFn: (body: CompanyInput) => companyService.update(organizationId, companyId, body),
    onSuccess: invalidate,
  })
}

export const useDeleteCompany = (organizationId: string) => {
  const invalidate = useCompanyMutation(organizationId)
  return useMutation({
    mutationFn: (companyId: string) => companyService.remove(organizationId, companyId),
    onSuccess: invalidate,
  })
}
