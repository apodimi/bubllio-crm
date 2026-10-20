// @vitest-environment jsdom

import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activityInboxKeys } from '../../activity-inbox'
import { companyService } from '../services/companyService'
import { companyKeys, useCreateCompany } from './useCompanies'

vi.mock('../services/companyService', () => ({
  companyService: { create: vi.fn() },
}))

describe('company signal invalidation', () => {
  beforeEach(() => vi.mocked(companyService.create).mockReset())

  it('refreshes company data and the action inbox after create', async () => {
    vi.mocked(companyService.create).mockResolvedValue({ id: 'company-a' } as never)
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useCreateCompany('org-a'), { wrapper })

    await act(async () => {
      result.current.mutate({ name: 'Acme' } as never)
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: companyKeys.byOrganization('org-a') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activityInboxKeys.detail('org-a') })
  })
})
