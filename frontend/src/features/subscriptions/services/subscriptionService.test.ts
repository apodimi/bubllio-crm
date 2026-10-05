import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../../services/api'
import { subscriptionService } from './subscriptionService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('subscriptionService', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('schedules cancellation inside the selected organization', async () => {
    vi.mocked(request).mockResolvedValueOnce({})

    await subscriptionService.cancelSubscription('org-a', 'sub-a', 'end_of_period')

    expect(request).toHaveBeenCalledWith(
      '/organizations/org-a/services/subscriptions/sub-a/cancel/',
      { method: 'POST', body: { mode: 'end_of_period' } },
    )
  })

  it('loads overview metrics from the tenant-scoped endpoint', async () => {
    vi.mocked(request).mockResolvedValueOnce({})
    const signal = new AbortController().signal

    await subscriptionService.overview('org-a', signal)

    expect(request).toHaveBeenCalledWith('/organizations/org-a/services/overview/', { signal })
  })
})
