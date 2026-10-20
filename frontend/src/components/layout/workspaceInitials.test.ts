import { describe, expect, it } from 'vitest'

import { workspaceInitials } from './workspaceInitials'

describe('workspaceInitials', () => {
  it.each([
    ['Bubllio Demo Workspace', 'BD'],
    ['Acme', 'A'],
    ['  north   star  ', 'NS'],
    ['', ''],
    ['   ', ''],
  ])('creates stable initials for %j', (name, expected) => {
    expect(workspaceInitials(name)).toBe(expected)
  })
})
