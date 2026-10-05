import { describe, expect, it } from 'vitest'
import { companySchema } from './companySchema'

describe('companySchema', () => {
  it('accepts a complete company', () => {
    expect(
      companySchema.safeParse({
        name: 'Acme',
        tax_id: 'EL123456789',
        industry: 'Technology',
        email: 'hello@acme.test',
        phone_number: '+30 210 000 0000',
        website: 'https://acme.test',
        address_line_1: '1 Market Street',
        address_line_2: '',
        city: 'Athens',
        postal_code: '105 63',
        country: 'GR',
        notes: 'Priority account',
        lifecycle_stage: 'customer',
        assigned_to: null,
      }).success,
    ).toBe(true)
  })

  it('rejects invalid contact details', () => {
    const result = companySchema.safeParse({
      name: '',
      tax_id: '',
      industry: '',
      email: 'invalid',
      phone_number: '1'.repeat(21),
      website: 'invalid',
      address_line_1: '',
      address_line_2: '',
      city: '',
      postal_code: '',
      country: 'Greece',
      notes: '',
      lifecycle_stage: 'lead',
    })
    expect(result.success).toBe(false)
  })
})
