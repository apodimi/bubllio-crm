import { describe, expect, it } from 'vitest'

import { contactSchema } from './contactSchema'

const validContact = {
  company: '11111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '',
  department: '',
  job_title: 'Engineer',
  assigned_to: null,
  status: 'active' as const,
  is_primary: true,
}

describe('contactSchema', () => {
  it('accepts a valid contact', () => {
    expect(contactSchema.safeParse(validContact).success).toBe(true)
  })

  it('allows an empty optional email', () => {
    expect(contactSchema.safeParse({ ...validContact, email: '' }).success).toBe(true)
  })

  it('rejects invalid email and company values', () => {
    expect(contactSchema.safeParse({ ...validContact, email: 'invalid' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...validContact, company: '' }).success).toBe(false)
  })
})
