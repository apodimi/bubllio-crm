import { beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from '../../../services/api'
import type { DealCostInput } from '../../../types/costing.types'
import { costingService } from './costingService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('costingService', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('filters collaborator services inside the tenant-scoped endpoint', async () => {
    vi.mocked(request).mockResolvedValueOnce([])
    const signal = new AbortController().signal

    await costingService.listServices('org-a', 'collaborator-a', signal)

    expect(request).toHaveBeenCalledWith(
      '/organizations/org-a/costing/collaborator-services/?collaborator=collaborator-a',
      { signal },
    )
  })

  it('creates a deal cost on the nested deal endpoint without changing decimal strings', async () => {
    vi.mocked(request).mockResolvedValueOnce({})
    const body: DealCostInput = {
      collaborator: 'collaborator-a',
      collaborator_service: 'service-a',
      service_name: 'Logo',
      description: '',
      quantity: '1',
      unit_cost: '50.00',
      currency: 'EUR',
      status: 'committed',
    }

    await costingService.createDealCost('org-a', 'deal-a', body)

    expect(request).toHaveBeenCalledWith('/organizations/org-a/deals/deal-a/costs/', {
      method: 'POST',
      body,
    })
  })

  it('loads profitability independently from cost lines', async () => {
    vi.mocked(request).mockResolvedValueOnce({})

    await costingService.profitability('org-a', 'deal-a')

    expect(request).toHaveBeenCalledWith('/organizations/org-a/deals/deal-a/profitability/', {
      signal: undefined,
    })
  })
})
