import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../../services/api'
import { taskService } from './taskService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('taskService', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('loads a tenant-scoped personal overdue view', async () => {
    vi.mocked(request).mockResolvedValueOnce([])
    const signal = new AbortController().signal

    await taskService.list('org-a', { bucket: 'overdue', assignedTo: 'me' }, signal)

    expect(request).toHaveBeenCalledWith(
      '/organizations/org-a/tasks/?bucket=overdue&assigned_to=me',
      { signal },
    )
  })

  it('completes a task inside the selected organization', async () => {
    vi.mocked(request).mockResolvedValueOnce({})

    await taskService.complete('org-a', 'task-a')

    expect(request).toHaveBeenCalledWith('/organizations/org-a/tasks/task-a/complete/', {
      body: {},
    })
  })

  it('moves a task through its workflow endpoint', async () => {
    vi.mocked(request).mockResolvedValueOnce({})

    await taskService.move('org-a', 'task-a', 'waiting')

    expect(request).toHaveBeenCalledWith('/organizations/org-a/tasks/task-a/move/', {
      body: { workflow_status: 'waiting' },
    })
  })
})
