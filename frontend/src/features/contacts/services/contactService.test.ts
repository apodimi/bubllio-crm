import { expect, it, vi } from 'vitest'

import { request } from '../../../services/api'
import { contactService } from './contactService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

it('scopes paginated contact search to its tenant and company', async () => {
  const signal = new AbortController().signal
  await contactService.page('org-a', { company: 'co-a', search: ' Maria ' }, 0, signal)
  expect(request).toHaveBeenCalledWith(
    '/organizations/org-a/contacts/?page=1&page_size=50&search=Maria&company=co-a',
    { signal },
  )
})

it('loads one contact from its tenant-scoped detail endpoint', async () => {
  const signal = new AbortController().signal

  await contactService.get('org-a', 'contact/a', signal)

  expect(request).toHaveBeenCalledWith('/organizations/org-a/contacts/contact%2Fa/', { signal })
})
