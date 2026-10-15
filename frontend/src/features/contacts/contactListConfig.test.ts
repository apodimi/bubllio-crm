import { describe, expect, it } from 'vitest'

import { parseContactSearch } from './contactListConfig'

describe('parseContactSearch', () => {
  it('keeps supported contact list state', () => {
    expect(
      parseContactSearch({
        contact: 'contact-a',
        create: 'true',
        q: 'Maria',
        view: 'archived',
        company: 'company-a',
        page: '3',
      }),
    ).toEqual({
      contact: 'contact-a',
      create: true,
      q: 'Maria',
      view: 'archived',
      company: 'company-a',
      page: 3,
    })
  })

  it('drops unsupported and empty values', () => {
    expect(parseContactSearch({ q: '   ', view: 'deleted', company: '', page: 0 })).toEqual({})
  })
})
