import { describe, expect, it } from 'vitest'

import { taskFromDragData, taskStatusFromDragData } from './taskBoardDnd'

describe('task board drag data', () => {
  it('rejects malformed task and status payloads', () => {
    expect(taskFromDragData(undefined)).toBeUndefined()
    expect(taskFromDragData({ task: { id: 'task-a', workflow_status: 'invalid' } })).toBeUndefined()
    expect(taskStatusFromDragData({ workflowStatus: 'invalid' })).toBeUndefined()
  })

  it('accepts direct and nested workflow statuses', () => {
    const task = {
      id: 'task-a',
      workflow_status: 'todo',
      title: 'Follow up',
      company_name: 'Acme',
      deal_title: '',
      kind: 'task',
      priority: 'normal',
      effective_status: 'open',
      due_at: '2030-01-01T09:00:00Z',
      assigned_to_name: '',
    }

    expect(taskFromDragData({ task })).toBe(task)
    expect(taskStatusFromDragData({ workflowStatus: 'waiting' })).toBe('waiting')
    expect(taskStatusFromDragData({ task: { workflow_status: 'completed' } })).toBe('completed')
  })
})
