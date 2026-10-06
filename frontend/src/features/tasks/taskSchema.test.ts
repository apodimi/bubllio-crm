import { describe, expect, it } from 'vitest'
import { taskSchema } from './taskSchema'

const validTask = {
  company: '4b6e7d72-6cf7-40fd-8da0-21adb90ac757',
  contact: null,
  deal: null,
  assigned_to: null,
  title: 'Call about renewal',
  kind: 'call' as const,
  priority: 'high' as const,
  due_at: '2026-10-08T10:00',
  reminder_at: '2026-10-08T09:00',
  notes: '',
}

describe('taskSchema', () => {
  it('accepts a complete task', () => {
    expect(taskSchema.safeParse(validTask).success).toBe(true)
  })

  it('rejects a reminder after the due time', () => {
    const result = taskSchema.safeParse({ ...validTask, reminder_at: '2026-10-08T11:00' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['reminder_at'])
  })
})
