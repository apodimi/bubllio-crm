import { z } from 'zod'

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === '' || z.string().email().safeParse(value).success, {
    message: 'Enter a valid email address.',
  })

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === '' || z.string().url().safeParse(value).success, {
    message: 'Enter a complete URL, including https://.',
  })

export const workspaceSettingsSchema = z.object({
  timezone: z.string().min(1, 'Choose a time zone.'),
  locale: z.string().min(1, 'Choose a locale.'),
  default_from_name: z.string().trim().max(255),
  legal_name: z.string().trim().max(255),
  trading_name: z.string().trim().max(255),
  tax_id: z.string().trim().max(64),
  tax_office: z.string().trim().max(255),
  registration_number: z.string().trim().max(128),
  business_email: optionalEmail,
  phone: z.string().trim().max(32),
  website: optionalUrl,
  address_line_1: z.string().trim().max(255),
  address_line_2: z.string().trim().max(255),
  city: z.string().trim().max(128),
  postal_code: z.string().trim().max(32),
  country: z
    .string()
    .trim()
    .regex(/^$|^[A-Za-z]{2}$/, 'Use a two-letter country code.'),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'Use a three-letter currency code.'),
  fiscal_year_start_month: z.number().int().min(1).max(12),
  default_tax_rate: z
    .string()
    .trim()
    .refine((value) => value !== '' && Number(value) >= 0 && Number(value) <= 100, {
      message: 'Tax rate must be between 0 and 100.',
    }),
  default_payment_terms_days: z.number().int().min(0),
  document_prefix: z.string().trim().max(32),
  next_document_number: z.number().int().min(1),
})
