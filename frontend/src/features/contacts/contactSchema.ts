import { z } from 'zod'

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === '' || z.string().email().safeParse(value).success, {
    message: 'Enter a valid email address.',
  })

export const contactSchema = z.object({
  company: z.string().min(1, 'Choose a company.'),
  first_name: z.string().trim().min(1, 'First name is required.').max(150),
  last_name: z.string().trim().max(150),
  email: optionalEmail,
  phone_number: z.string().trim().max(20),
  department: z.string().trim().max(150),
  job_title: z.string().trim().max(150),
  assigned_to: z.number().int().positive().nullable(),
  status: z.enum(['active', 'former']),
  is_primary: z.boolean(),
})

export type ContactFormValues = z.infer<typeof contactSchema>
