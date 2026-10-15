import { request } from '../../../services/api'
import type { GlobalSearchResponse } from '../../../types/global-search.types'

export const globalSearchService = {
  search: (query: string, organizationId?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      q: query.trim(),
      types: 'company,contact,deal',
      page: '1',
      page_size: '20',
    })
    if (organizationId) {
      params.set('organization', organizationId)
    }
    return request<GlobalSearchResponse>(`/search/?${params}`, { signal })
  },
}
