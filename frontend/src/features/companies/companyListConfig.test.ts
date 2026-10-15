import { describe, expect, it } from 'vitest'

import { parseCompanySearch } from './companyListConfig'

describe('parseCompanySearch', () => {
  it('keeps supported company list state with normalized numeric values', () => {
    expect(
      parseCompanySearch({
        company: 'CUS-00001',
        create: 'true',
        q: 'Acme',
        view: 'archived',
        stage: 'customer',
        owner: 7,
        sort: '-created_at',
        page: '3',
      }),
    ).toEqual({
      company: 'CUS-00001',
      create: true,
      q: 'Acme',
      view: 'archived',
      stage: 'customer',
      owner: '7',
      sort: '-created_at',
      page: 3,
    })
  })

  it('drops unsupported and empty values', () => {
    expect(
      parseCompanySearch({
        q: '   ',
        view: 'deleted',
        stage: 'unknown',
        owner: '-2',
        sort: 'random',
        page: 0,
      }),
    ).toEqual({})
  })

  it('keeps the explicit unassigned owner filter', () => {
    expect(parseCompanySearch({ owner: 'unassigned' })).toEqual({ owner: 'unassigned' })
  })
})
