import { describe, expect, it } from 'vitest'

import { globalSearchReducer, initialGlobalSearchState } from './globalSearchState'

describe('globalSearchReducer', () => {
  it('resets the search session when it closes', () => {
    const state = globalSearchReducer(
      {
        open: true,
        query: 'acme',
        activeIndex: 2,
        searchAllWorkspaces: true,
      },
      { type: 'close' },
    )

    expect(state).toEqual(initialGlobalSearchState)
  })

  it('resets selection when query or scope changes', () => {
    const queried = globalSearchReducer(
      { ...initialGlobalSearchState, activeIndex: 3 },
      { type: 'queryChanged', query: 'renewal' },
    )
    const scoped = globalSearchReducer(
      { ...queried, activeIndex: 2 },
      { type: 'scopeChanged', searchAllWorkspaces: true },
    )

    expect(queried).toMatchObject({ query: 'renewal', activeIndex: 0 })
    expect(scoped).toMatchObject({ searchAllWorkspaces: true, activeIndex: 0 })
  })
})
