// @vitest-environment jsdom

import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contactService } from '../services/contactService'
import { useContacts } from './useContacts'

vi.mock('../services/contactService', () => ({
  contactService: { list: vi.fn() },
}))

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useContacts', () => {
  beforeEach(() => vi.mocked(contactService.list).mockReset())
  afterEach(cleanup)

  it('does not request contacts until its dependency is available', () => {
    const { result } = renderHook(() => useContacts('org-a', { company: '' }, false), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(contactService.list).not.toHaveBeenCalled()
  })

  it('requests contacts when enabled', async () => {
    vi.mocked(contactService.list).mockResolvedValue([])

    const { result } = renderHook(() => useContacts('org-a', { company: 'company-a' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(contactService.list).toHaveBeenCalledWith(
      'org-a',
      { company: 'company-a' },
      expect.any(AbortSignal),
    )
  })
})
