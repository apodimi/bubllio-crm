import { queryOptions, useQuery } from '@tanstack/react-query'
import { organizationService } from '../services/organizationService'

export const organizationKeys = {
  all: ['organizations'] as const,
  detail: (id: string) => ['organizations', id] as const,
}

const organizationsQuery = queryOptions({
  queryKey: organizationKeys.all,
  queryFn: ({ signal }) => organizationService.list(signal),
})

const organizationQuery = (id: string) => queryOptions({
  queryKey: organizationKeys.detail(id),
  queryFn: ({ signal }) => organizationService.get(id, signal),
})

export const useOrganizations = () => useQuery(organizationsQuery)
export const useOrganization = (id: string) => useQuery(organizationQuery(id))
