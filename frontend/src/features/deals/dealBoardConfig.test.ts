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

  it('keeps built-in saved views', () => {
    expect(parseDealSearch({ view: 'all' })).toEqual({ view: 'all' })
    expect(parseDealSearch({ view: 'mine' })).toEqual({ view: 'mine' })
    expect(parseDealSearch({ view: 'no_next_action' })).toEqual({ view: 'no_next_action' })
    expect(parseDealSearch({ view: 'closing_this_month' })).toEqual({ view: 'closing_this_month' })
  })
})
