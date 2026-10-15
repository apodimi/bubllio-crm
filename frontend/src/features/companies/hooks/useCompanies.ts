import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { CompanyInput, CompanyTimelineCategory } from '../../../types/company.types'
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
  timeline: (organizationId: string, companyId: string) =>
    [...companyKeys.detail(organizationId, companyId), 'timeline'] as const,
  timelineList: (organizationId: string, companyId: string, category?: CompanyTimelineCategory) =>
    [...companyKeys.timeline(organizationId, companyId), category ?? 'all'] as const,
}

const companiesQuery = (organizationId: string, filters: CompanyFilters) =>
  queryOptions({
    queryKey: companyKeys.list(organizationId, filters),
    queryFn: ({ signal }) => companyService.list(organizationId, filters, signal),
  })

export const useCompanies = (
  organizationId: string,
  filters: CompanyFilters = {},
  enabled = true,
) => useQuery({ ...companiesQuery(organizationId, filters), enabled })

export const useCrmSummary = (organizationId: string) =>
  useQuery({
    queryKey: ['organizations', organizationId, 'crm-summary'],
    queryFn: ({ signal }) => companyService.summary(organizationId, signal),
    staleTime: 0,
  })

export function useCompanyPage(organizationId: string, filters: CompanyFilters, page: number) {
  const query = useQuery({
    queryKey: [...companyKeys.list(organizationId, filters), 'page', page],
    queryFn: ({ signal }) => companyService.page(organizationId, filters, page, signal),
  })
  return { ...query, data: query.data?.results, count: query.data?.count ?? 0 }
}

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

const companyTimelineQuery = (
  organizationId: string,
  companyId: string,
  category?: CompanyTimelineCategory,
) =>
  infiniteQueryOptions({
    queryKey: companyKeys.timelineList(organizationId, companyId, category),
    queryFn: ({ pageParam, signal }) =>
      companyService.timeline(organizationId, companyId, pageParam, category, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((total, page) => total + page.results.length, 0)
      return loaded < lastPage.count ? pages.length + 1 : undefined
    },
  })

export const useCompanyTimeline = (
  organizationId: string,
  companyId: string,
  category?: CompanyTimelineCategory,
) =>
  useInfiniteQuery({
    ...companyTimelineQuery(organizationId, companyId, category),
    enabled: Boolean(companyId),
  })

export const useAddCompanyTimelineNote = (organizationId: string, companyId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => companyService.addTimelineNote(organizationId, companyId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: companyKeys.timeline(organizationId, companyId) }),
  })
}

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

export const useQuickUpdateCompany = (organizationId: string) => {
  const invalidate = useCompanyMutation(organizationId)
  return useMutation({
    mutationFn: ({ companyId, body }: { companyId: string; body: Partial<CompanyInput> }) =>
      companyService.update(organizationId, companyId, body),
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
