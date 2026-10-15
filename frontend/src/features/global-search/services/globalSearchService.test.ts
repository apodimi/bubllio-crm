import { beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from '../../../services/api'
import { globalSearchService } from './globalSearchService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('globalSearchService', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('trims and encodes a bounded query scoped to the selected organization', async () => {
    const signal = new AbortController().signal

    await globalSearchService.search(' Acme & Co ', 'org/a', signal)

    expect(request).toHaveBeenCalledWith(
      '/search/?q=Acme+%26+Co&types=company%2Ccontact%2Cdeal&page=1&page_size=20&organization=org%2Fa',
      { signal },
    )
  })

  it('omits the organization filter for an all-workspaces search', async () => {
    await globalSearchService.search('Acme')

    expect(request).toHaveBeenCalledWith(
      '/search/?q=Acme&types=company%2Ccontact%2Cdeal&page=1&page_size=20',
      { signal: undefined },
    )
  })
})
