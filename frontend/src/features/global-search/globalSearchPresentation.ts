import type { GlobalSearchResult, GlobalSearchResultType } from '../../types/global-search.types'

const resultTypes: GlobalSearchResultType[] = ['company', 'contact', 'deal']

export interface GlobalSearchResultGroup {
  type: GlobalSearchResultType
  results: GlobalSearchResult[]
}

export function groupGlobalSearchResults(results: GlobalSearchResult[]): GlobalSearchResultGroup[] {
  return resultTypes
    .map((type) => ({ type, results: results.filter((result) => result.type === type) }))
    .filter((group) => group.results.length > 0)
}

export function globalSearchResultDetails(result: GlobalSearchResult, includeWorkspace: boolean) {
  const details: Array<string | undefined> = []
  if (includeWorkspace) {
    details.push(result.organization.name)
  }
  if (result.type === 'company') {
    details.push(result.customer_code, result.lifecycle_stage)
  } else if (result.type === 'contact') {
    details.push(result.company?.name, result.job_title)
  } else {
    details.push(result.company?.name, result.stage)
    if (result.value && result.currency) {
      details.push(`${result.value} ${result.currency}`)
    }
  }
  return details.filter(Boolean).join(' · ')
}
