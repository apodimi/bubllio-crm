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

  it('serializes supported pipeline filters', async () => {
    const signal = new AbortController().signal

    await dealService.list(
      'org-a',
      { search: ' Renewal ', stage: 'proposal', archived: 'archived' },
      signal,
    )

    expect(request).toHaveBeenCalledWith(
      '/organizations/org-a/deals/?search=Renewal&stage=proposal&archived=archived',
      { signal },
    )
  })

  it('archives through the tenant-scoped deal action', async () => {
    await dealService.archive('org-a', 'deal/a')

    expect(request).toHaveBeenCalledWith('/organizations/org-a/deals/deal%2Fa/archive/', {
      method: 'POST',
    })
  })
})
