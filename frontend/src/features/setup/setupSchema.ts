import { z } from 'zod'

const required = (label: string) => z.string().trim().min(1, `${label} is required.`)

/** The same values stay in memory while the user moves between setup steps. */
export const setupSchema = z
  .object({
    setup_token: z.string().min(32, 'Enter the full setup token from the server.'),
    username: required('Admin username'),
    email: z.string().trim().email('Enter a valid admin email address.'),
    password: z.string().min(8, 'Use at least 8 characters for the admin password.'),
    organization_name: required('Workspace name'),
    organization_slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
    smtp_enabled: z.boolean(),
    smtp_name: z.string(),
    smtp_from_email: z.string(),
    smtp_host: z.string(),
    smtp_port: z.string(),
    smtp_username: z.string(),
    smtp_password: z.string(),
    smtp_use_ssl: z.boolean(),
    smtp_recipient: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.smtp_enabled) return

    const requiredSmtpFields = [
      ['smtp_name', 'Email account label'],
      ['smtp_host', 'SMTP server hostname'],
      ['smtp_username', 'SMTP login username'],
      ['smtp_password', 'SMTP login password'],
    ] as const
    for (const [field, label] of requiredSmtpFields) {
      if (!values[field].trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${label} is required.`,
        })
      }
    }
    if (!z.string().email().safeParse(values.smtp_from_email).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['smtp_from_email'],
        message: 'Enter a valid sender email address.',
      })
    }
    const port = Number(values.smtp_port)
    if (!/^\d+$/.test(values.smtp_port) || !Number.isInteger(port) || port < 1 || port > 65535) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['smtp_port'],
        message: 'Enter a port from 1 to 65535.',
      })
    }
  })

export const testRecipientSchema = z.string().trim().email('Enter a valid recipient email address.')

export type SetupFormValues = z.infer<typeof setupSchema>

export const setupDefaults: SetupFormValues = {
  setup_token: '',
  username: '',
  email: '',
  password: '',
  organization_name: '',
  organization_slug: '',
  smtp_enabled: false,
  smtp_name: 'Primary',
  smtp_from_email: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_username: '',
  smtp_password: '',
  smtp_use_ssl: false,
  smtp_recipient: '',
}
