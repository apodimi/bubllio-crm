import { z } from 'zod'

export const taskSchema = z
  .object({
    company: z.string().min(1, 'Choose a company.'),
    contact: z.string().uuid().nullable(),
    deal: z.string().uuid().nullable(),
    assigned_to: z.number().int().positive().nullable(),
    title: z.string().trim().min(1, 'Task title is required.').max(255),
    kind: z.enum(['task', 'call', 'email', 'meeting']),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    due_at: z.string().min(1, 'Due date and time are required.'),
    reminder_at: z.string().nullable(),
    notes: z.string().trim().max(5000, 'Use at most 5,000 characters.'),
  })
  .superRefine((values, context) => {
    if (
      values.reminder_at &&
      values.due_at &&
      new Date(values.reminder_at) > new Date(values.due_at)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reminder_at'],
        message: 'The reminder must be before the due time.',
      })
    }
  })

export type TaskFormValues = z.infer<typeof taskSchema>
