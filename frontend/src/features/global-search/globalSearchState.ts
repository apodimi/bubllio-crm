export interface GlobalSearchState {
  open: boolean
  query: string
  activeIndex: number
  searchAllWorkspaces: boolean
}

export type GlobalSearchAction =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'queryChanged'; query: string }
  | { type: 'scopeChanged'; searchAllWorkspaces: boolean }
  | { type: 'activeIndexChanged'; activeIndex: number }

export const initialGlobalSearchState: GlobalSearchState = {
  open: false,
  query: '',
  activeIndex: 0,
  searchAllWorkspaces: false,
}

export function globalSearchReducer(
  state: GlobalSearchState,
  action: GlobalSearchAction,
): GlobalSearchState {
  switch (action.type) {
    case 'open':
      return { ...state, open: true, searchAllWorkspaces: false }
    case 'close':
      return initialGlobalSearchState
    case 'queryChanged':
      return { ...state, query: action.query, activeIndex: 0 }
    case 'scopeChanged':
      return { ...state, searchAllWorkspaces: action.searchAllWorkspaces, activeIndex: 0 }
    case 'activeIndexChanged':
      return { ...state, activeIndex: action.activeIndex }
  }
}
