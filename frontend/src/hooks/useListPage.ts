import { useState } from 'react'

export const LIST_PAGE_SIZE = 50

export function useListPage(filterKey: string) {
  const [state, setState] = useState({ filterKey, page: 0 })
  // Reset in the same render as a filter change: never fetch an old page of
  // the new filter or briefly expose another tenant's cached results.
  if (state.filterKey !== filterKey) {
    setState({ filterKey, page: 0 })
  }
  const page = state.filterKey === filterKey ? state.page : 0
  return { page, setPage: (page: number) => setState({ filterKey, page }) }
}
