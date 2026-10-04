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
  email: optionalEmail,
  phone_number: z.string().trim().max(20, 'Use at most 20 characters.'),
  website: optionalUrl,
  lifecycle_stage: z.enum(['lead', 'prospect', 'customer', 'inactive']),
})

export type CompanyFormValues = z.infer<typeof companySchema>
