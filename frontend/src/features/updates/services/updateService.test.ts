import { beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from '../../../services/api'
import { updatePreflightContract, updateRunContract } from '../../../types/api-contract/schemas'
import { updateService } from './updateService'

vi.mock('../../../services/api', () => ({ request: vi.fn() }))

describe('update service', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('requests a fresh preflight for the exact target version', async () => {
    await updateService.preflight('0.2.0')

    expect(request).toHaveBeenCalledWith('/installation/updates/preflight/', {
      body: { target_version: '0.2.0' },
      schema: updatePreflightContract,
    })
  })

  it('starts an update with an explicit idempotency key', async () => {
    await updateService.start('0.2.0', 'update_request_123', 'correct horse battery staple')

    expect(request).toHaveBeenCalledWith('/installation/updates/', {
      body: {
        target_version: '0.2.0',
        current_password: 'correct horse battery staple',
      },
      headers: { 'Idempotency-Key': 'update_request_123' },
      schema: updateRunContract,
    })
  })
})
