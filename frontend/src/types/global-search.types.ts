export type GlobalSearchResultType = 'company' | 'contact' | 'deal'

export interface GlobalSearchOrganization {
  id: string
  name: string
}

export interface GlobalSearchResult {
  type: GlobalSearchResultType
  id: string
  display_name: string
  organization: GlobalSearchOrganization
  customer_code?: string
  lifecycle_stage?: string
  company?: { id: string; name: string }
  job_title?: string
  stage?: string
  value?: string
  currency?: string
}

export interface GlobalSearchResponse {
  query: string
  count: number
  page: number
  page_size: number
  results: GlobalSearchResult[]
}
