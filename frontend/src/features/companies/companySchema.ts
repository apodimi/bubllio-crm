import { z } from 'zod'

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => !value || z.string().email().safeParse(value).success, 'Enter a valid email.')

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || z.string().url().safeParse(value).success, 'Enter a valid URL.')

export const companySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required.').max(255),
  tax_id: z.string().trim().max(64, 'Use at most 64 characters.'),
  industry: z.string().trim().max(120, 'Use at most 120 characters.'),
  email: optionalEmail,
  phone_number: z.string().trim().max(20, 'Use at most 20 characters.'),
  website: optionalUrl,
  address_line_1: z.string().trim().max(255),
  address_line_2: z.string().trim().max(255),
  city: z.string().trim().max(120),
  postal_code: z.string().trim().max(32),
  country: z
    .string()
    .trim()
    .refine((value) => !value || /^[a-z]{2}$/i.test(value), 'Use a two-letter country code.'),
  notes: z.string().trim().max(5000, 'Use at most 5,000 characters.'),
  lifecycle_stage: z.enum(['lead', 'prospect', 'customer', 'inactive']),
  assigned_to: z.number().int().positive().nullable().default(null),
})

export type CompanyFormValues = z.infer<typeof companySchema>
