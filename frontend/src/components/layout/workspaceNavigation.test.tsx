import { describe, expect, it } from 'vitest'

import { selectedMobileNavigation, workspaceNavigation } from './workspaceNavigation'

describe('workspace navigation', () => {
  it('derives the selected mobile destination from shared route metadata', () => {
    expect(selectedMobileNavigation('/organizations/acme/tasks', 'acme')).toBe('tasks')
    expect(selectedMobileNavigation('/organizations/acme/services/billing', 'acme')).toBe(
      'services',
    )
    expect(selectedMobileNavigation('/organizations/acme/contacts', 'acme')).toBe('companies')
  })

  it('keeps management destinations out of the mobile dock', () => {
    expect(workspaceNavigation.filter((item) => item.mobile).map((item) => item.key)).toEqual([
      'overview',
      'companies',
      'deals',
      'tasks',
      'services',
    ])
  })
})
