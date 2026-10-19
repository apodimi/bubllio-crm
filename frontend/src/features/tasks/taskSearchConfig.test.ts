import { describe, expect, it } from 'vitest'

import { parseTaskSearch } from './taskSearchConfig'

describe('parseTaskSearch', () => {
  it('keeps a bookmarkable focus view', () => {
    expect(parseTaskSearch({ view: 'focus', owner: 'me', kind: 'call', q: 'follow up' })).toEqual({
      view: 'focus',
      owner: 'me',
      kind: 'call',
      q: 'follow up',
    })
  })

  it('drops unsupported and empty values', () => {
    expect(parseTaskSearch({ view: 'later', owner: 'nobody', kind: 'visit', q: '  ' })).toEqual({})
  })
})
