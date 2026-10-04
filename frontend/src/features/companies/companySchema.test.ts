import { describe, expect, it } from 'vitest'
import { companySchema } from './companySchema'

describe('companySchema', () => {
  it('accepts a complete company', () => {
    expect(
      companySchema.safeParse({
        name: 'Acme',
        email: 'hello@acme.test',
        phone_number: '+30 210 000 0000',
        website: 'https://acme.test',
        lifecycle_stage: 'customer',
      }).success,
    ).toBe(true)
  })

  it('rejects invalid contact details', () => {
    const result = companySchema.safeParse({
      name: '',
      email: 'invalid',
      phone_number: '1'.repeat(21),
      website: 'invalid',
      lifecycle_stage: 'lead',
    })
    expect(result.success).toBe(false)
  })
})
