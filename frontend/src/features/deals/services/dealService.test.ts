import { beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from '../../../services/api'
import { dealService } from './dealService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('dealService', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('loads one deal from its tenant-scoped detail endpoint', async () => {
    const signal = new AbortController().signal

    await dealService.get('org-a', 'deal/a', signal)

    expect(request).toHaveBeenCalledWith('/organizations/org-a/deals/deal%2Fa/', { signal })
  })
})
