import { expect, it } from 'vitest'
import { setupDefaults, setupSchema, testRecipientSchema } from './setupSchema'

const valid = {
  ...setupDefaults,
  setup_token: 'a'.repeat(32),
  username: 'admin',
  email: 'admin@example.com',
  password: 'safe-password-123',
  organization_name: 'Nerds Lab',
  organization_slug: 'nerds-lab',
}

it('allows setup without SMTP', () => {
  expect(setupSchema.safeParse(valid).success).toBe(true)
})

it('requires valid SMTP details only when enabled', () => {
  const result = setupSchema.safeParse({ ...valid, smtp_enabled: true })
  expect(result.success).toBe(false)
  if (!result.success) expect(result.error.flatten().fieldErrors.smtp_host).toBeDefined()
})

it('validates SMTP port and test recipient', () => {
  const result = setupSchema.safeParse({
    ...valid,
    smtp_enabled: true,
    smtp_name: 'Primary',
    smtp_host: 'smtp.example.com',
    smtp_username: 'mailer',
    smtp_password: 'secret',
    smtp_from_email: 'hello@example.com',
    smtp_port: '99999',
  })
  expect(result.success).toBe(false)
  if (!result.success) expect(result.error.flatten().fieldErrors.smtp_port).toBeDefined()
  expect(testRecipientSchema.safeParse('invalid').success).toBe(false)
  expect(testRecipientSchema.safeParse('owner@example.com').success).toBe(true)
})
