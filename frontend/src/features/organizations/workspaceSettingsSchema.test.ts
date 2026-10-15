import { describe, expect, it } from 'vitest'

import { workspaceSettingsSchema } from './workspaceSettingsSchema'

const validSettings = {
  timezone: 'Europe/Athens',
  locale: 'en',
  default_from_name: '',
  legal_name: '',
  trading_name: '',
  tax_id: '',
  tax_office: '',
  registration_number: '',
  business_email: '',
  phone: '',
  website: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  postal_code: '',
  country: 'GR',
  currency: 'EUR',
  fiscal_year_start_month: 1,
  default_tax_rate: '24.00',
  default_payment_terms_days: 30,
  document_prefix: 'INV',
  next_document_number: 1,
}

describe('workspaceSettingsSchema', () => {
  it('accepts valid workspace settings', () => {
    expect(workspaceSettingsSchema.safeParse(validSettings).success).toBe(true)
  })

  it('validates ERP bounds and regional codes', () => {
    expect(
      workspaceSettingsSchema.safeParse({ ...validSettings, default_tax_rate: '101' }).success,
    ).toBe(false)
    expect(workspaceSettingsSchema.safeParse({ ...validSettings, country: 'GRC' }).success).toBe(
      false,
    )
  })
})
