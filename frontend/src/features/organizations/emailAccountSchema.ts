import { z } from 'zod'

export const emailAccountSchema = z.object({
  name: z.string().trim().min(1, 'Connection name is required.').max(255),
  host: z.string().trim().min(1, 'SMTP hostname is required.').max(255),
  port: z
    .string()
    .regex(/^\d+$/, 'Enter a numeric port.')
    .refine((value) => Number(value) >= 1 && Number(value) <= 65535, 'Use a port from 1 to 65535.'),
  username: z.string().trim().min(1, 'SMTP username is required.').max(255),
  password: z.string(),
  from_email: z.string().trim().email('Enter a valid sender email address.'),
  from_name: z.string().trim().max(255),
  security: z.enum(['starttls', 'ssl']),
})

export type EmailAccountFormValues = z.infer<typeof emailAccountSchema>

export const testRecipientSchema = z.string().trim().email('Enter a valid test recipient.')
