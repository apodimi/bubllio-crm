import { describe, expect, it } from 'vitest'
import { emailAccountSchema, testRecipientSchema } from './emailAccountSchema'

const valid = {
  name: 'Workspace SMTP',
  host: 'smtp.example.com',
  port: '587',
  username: 'mailer@example.com',
  password: '',
  from_email: 'hello@example.com',
  from_name: 'Bubllio CRM',
  security: 'starttls' as const,
}

describe('emailAccountSchema', () => {
  it('accepts an account update without replacing the password', () => {
    expect(emailAccountSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid ports and sender addresses', () => {
    expect(emailAccountSchema.safeParse({ ...valid, port: '70000' }).success).toBe(false)
    expect(emailAccountSchema.safeParse({ ...valid, from_email: 'invalid' }).success).toBe(false)
  })

  it('validates the test recipient independently', () => {
    expect(testRecipientSchema.safeParse('owner@example.com').success).toBe(true)
    expect(testRecipientSchema.safeParse('invalid').success).toBe(false)
  })
})
