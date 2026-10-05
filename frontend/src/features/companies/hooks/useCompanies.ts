import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CompanyInput } from '../../../types/company.types'
import { companyService } from '../services/companyService'
import type { CompanyFilters } from '../services/companyService'

export const companyKeys = {
  byOrganization: (organizationId: string) =>
    ['organizations', organizationId, 'companies'] as const,
  list: (organizationId: string, filters: CompanyFilters) =>
    [...companyKeys.byOrganization(organizationId), filters] as const,
  detail: (organizationId: string, companyId: string) =>
    [...companyKeys.byOrganization(organizationId), companyId] as const,
  activity: (organizationId: string, companyId: string) =>
    [...companyKeys.detail(organizationId, companyId), 'activity'] as const,
}

const companiesQuery = (organizationId: string, filters: CompanyFilters) =>
  queryOptions({
    queryKey: companyKeys.list(organizationId, filters),
    queryFn: ({ signal }) => companyService.list(organizationId, filters, signal),
  })

export const useCompanies = (organizationId: string, filters: CompanyFilters = {}) =>
  useQuery(companiesQuery(organizationId, filters))

export const useCompany = (organizationId: string, companyId: string) =>
  useQuery({
    queryKey: companyKeys.detail(organizationId, companyId),
    queryFn: ({ signal }) => companyService.get(organizationId, companyId, signal),
    enabled: Boolean(companyId),
  })

export const useCompanyActivity = (organizationId: string, companyId: string) =>
  useQuery({
    queryKey: companyKeys.activity(organizationId, companyId),
    queryFn: ({ signal }) => companyService.activity(organizationId, companyId, signal),
    enabled: Boolean(companyId),
  })

export const useCompanyAssignees = (organizationId: string) =>
  useQuery({
    queryKey: [...companyKeys.byOrganization(organizationId), 'assignees'],
    queryFn: ({ signal }) => companyService.assignees(organizationId, signal),
  })

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

export const useArchiveCompany = (organizationId: string) => {
  const invalidate = useCompanyMutation(organizationId)
  return useMutation({
    mutationFn: (companyId: string) => companyService.archive(organizationId, companyId),
    onSuccess: invalidate,
  })
}

export const useRestoreCompany = (organizationId: string) => {
  const invalidate = useCompanyMutation(organizationId)
  return useMutation({
    mutationFn: (companyId: string) => companyService.restore(organizationId, companyId),
    onSuccess: invalidate,
  })
}
