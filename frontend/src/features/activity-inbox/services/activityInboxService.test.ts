import { beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from '../../../services/api'
import { activityInboxService } from './activityInboxService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('activity inbox service', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('loads unresolved actions from the selected tenant with cancellation', async () => {
    const signal = new AbortController().signal

    await activityInboxService.list('org-a', signal)

    expect(request).toHaveBeenCalledWith('/organizations/org-a/activity-inbox/', { signal })
  })
})
