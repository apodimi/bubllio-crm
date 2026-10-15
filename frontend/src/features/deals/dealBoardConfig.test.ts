import { describe, expect, it } from 'vitest'

import { parseDealSearch } from './dealBoardConfig'

describe('parseDealSearch', () => {
  it('keeps supported board state', () => {
    expect(
      parseDealSearch({
        deal: 'deal-a',
        create: 'true',
        q: 'Renewal',
        view: 'archived',
        stage: 'proposal',
      }),
    ).toEqual({
      deal: 'deal-a',
      create: true,
      q: 'Renewal',
      view: 'archived',
      stage: 'proposal',
    })
  })

  it('drops unsupported and empty values', () => {
    expect(parseDealSearch({ q: '   ', view: 'deleted', stage: 'closed' })).toEqual({})
  })
})
