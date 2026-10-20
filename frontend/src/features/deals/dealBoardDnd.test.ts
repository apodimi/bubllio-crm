import { describe, expect, it } from 'vitest'

import { dealFromDragData, dealStageFromDragData } from './dealBoardDnd'

describe('deal board drag data', () => {
  it('rejects malformed deal and stage payloads', () => {
    expect(dealFromDragData(null)).toBeUndefined()
    expect(dealFromDragData({ deal: { id: 'deal-a', stage: 'invalid' } })).toBeUndefined()
    expect(dealStageFromDragData({ stage: 'invalid' })).toBeUndefined()
  })

  it('accepts the identifiers required by the board interaction', () => {
    const deal = {
      id: 'deal-a',
      stage: 'proposal',
      title: 'Renewal',
      company_name: 'Acme',
      currency: 'EUR',
      net_value: '100.00',
      lost_reason: '',
      expected_close_date: null,
      archived_at: null,
    }

    expect(dealFromDragData({ deal })).toBe(deal)
    expect(dealStageFromDragData({ stage: 'won' })).toBe('won')
  })
})
