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
      {
        search: ' Renewal ',
        stage: 'proposal',
        archived: 'active',
        assignedTo: 'me',
        nextAction: 'missing',
        expectedCloseFrom: '2026-10-01',
        expectedCloseTo: '2026-10-31',
        limit: 5,
      },
      signal,
    )

    expect(request).toHaveBeenCalledWith(
      '/organizations/org-a/deals/?search=Renewal&stage=proposal&archived=active&assigned_to=me&next_action=missing&expected_close_from=2026-10-01&expected_close_to=2026-10-31&limit=5',
      { signal },
    )
  })

  it('archives through the tenant-scoped deal action', async () => {
    await dealService.archive('org-a', 'deal/a')

    expect(request).toHaveBeenCalledWith('/organizations/org-a/deals/deal%2Fa/archive/', {
      method: 'POST',
    })
  })

  it('preserves the legacy all-deals request', async () => {
    await dealService.list('org-a', { archived: 'all' })

    expect(request).toHaveBeenCalledWith('/organizations/org-a/deals/?archived=all', {
      signal: undefined,
    })
  })
})
