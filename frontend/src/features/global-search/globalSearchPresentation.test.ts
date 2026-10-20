import { describe, expect, it } from 'vitest'

import type { GlobalSearchResult } from '../../types/global-search.types'

import { globalSearchResultDetails, groupGlobalSearchResults } from './globalSearchPresentation'

const organization = { id: 'org-a', name: 'Alpha Studio' }

function result(overrides: Partial<GlobalSearchResult>): GlobalSearchResult {
  return {
    type: 'company',
    id: 'record-a',
    display_name: 'Acme',
    organization,
    customer_code: 'CUS-1',
    lifecycle_stage: 'customer',
    ...overrides,
  }
}

describe('global search presentation', () => {
  it('groups results in stable company, contact, deal order', () => {
    const deal = result({ type: 'deal', id: 'deal-a', stage: 'proposal' })
    const company = result({ type: 'company', id: 'company-a' })

    expect(groupGlobalSearchResults([deal, company]).map((group) => group.type)).toEqual([
      'company',
      'deal',
    ])
  })

  it('adds workspace and domain context without empty separators', () => {
    expect(globalSearchResultDetails(result({}), true)).toBe('Alpha Studio · CUS-1 · customer')
    expect(globalSearchResultDetails(result({ customer_code: undefined }), false)).toBe('customer')
  })
})
