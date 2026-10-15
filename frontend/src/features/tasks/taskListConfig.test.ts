import { describe, expect, it } from 'vitest'

import type { CrmTask } from '../../types/task.types'
import { filterTasks, groupTasks } from './taskListConfig'

const task = (overrides: Partial<CrmTask>): CrmTask =>
  ({
    id: 'task-1',
    organization: 'org-1',
    company: 'company-1',
    company_name: 'Acme Systems',
    contact: null,
    contact_name: '',
    deal: null,
    deal_title: '',
    assigned_to: 1,
    assigned_to_name: 'Alex',
    created_by_name: 'Alex',
    completed_by_name: '',
    title: 'Confirm renewal terms',
    kind: 'call',
    priority: 'normal',
    workflow_status: 'todo',
    due_at: '2026-10-16T10:00:00Z',
    reminder_at: null,
    notes: '',
    effective_status: 'open',
    completed_at: null,
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
    ...overrides,
  }) as CrmTask

describe('task list organization', () => {
  it('groups focus tasks by urgency and date', () => {
    const now = new Date('2026-10-16T08:00:00Z')
    const groups = groupTasks(
      [
        task({ id: 'late', effective_status: 'overdue', due_at: '2026-10-15T09:00:00Z' }),
        task({ id: 'today', due_at: '2026-10-16T10:00:00Z' }),
        task({ id: 'later', due_at: '2026-10-18T10:00:00Z' }),
      ],
      'focus',
      now,
    )
    expect(groups.map((group) => [group.key, group.tasks[0]?.id])).toEqual([
      ['overdue', 'late'],
      ['today', 'today'],
      ['upcoming', 'later'],
    ])
  })

  it('searches task and relationship context', () => {
    const rows = [task({ deal_title: 'Annual renewal' })]
    expect(filterTasks(rows, 'annual')).toHaveLength(1)
    expect(filterTasks(rows, 'missing')).toHaveLength(0)
  })
})
