import { useQuery } from '@tanstack/react-query'

import { globalSearchService } from '../services/globalSearchService'

export const globalSearchKeys = {
  all: ['global-search'] as const,
  query: (query: string, organizationId?: string) =>
    [...globalSearchKeys.all, organizationId ?? 'all', query] as const,
}

export function useGlobalSearch(query: string, organizationId?: string) {
  const normalizedQuery = query.trim()
  return useQuery({
    queryKey: globalSearchKeys.query(normalizedQuery, organizationId),
    queryFn: ({ signal }) => globalSearchService.search(normalizedQuery, organizationId, signal),
    enabled: normalizedQuery.length >= 2,
    staleTime: 30_000,
  })
}
