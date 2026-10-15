import { beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from '../../../services/api'
import { companyService } from './companyService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('company pagination', () => {
  beforeEach(() => vi.mocked(request).mockReset())
  it('sends bounded pages, filters, and cancellation to the selected tenant', async () => {
    const signal = new AbortController().signal
    await companyService.page('org-a', { search: ' Acme ', archived: 'all' }, 1, signal)
    expect(request).toHaveBeenCalledWith(
      '/organizations/org-a/companies/?page=2&page_size=50&search=Acme&archived=all',
      { signal },
    )
  })
  it('loads counts without downloading the company list', async () => {
    await companyService.summary('org-b')
    expect(request).toHaveBeenCalledWith('/organizations/org-b/companies/summary/', {
      signal: undefined,
    })
  })
})
