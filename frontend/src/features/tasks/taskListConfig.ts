import type { CrmTask } from '../../types/task.types'

export type TaskView = 'focus' | 'upcoming' | 'all' | 'completed'
export type TaskGroupKey = 'overdue' | 'today' | 'upcoming' | 'all' | 'completed'

export interface TaskGroup {
  key: TaskGroupKey
  tasks: CrmTask[]
}

export function filterTasks(tasks: CrmTask[], query: string) {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) {
    return tasks
  }
  return tasks.filter((task) =>
    [task.title, task.company_name, task.deal_title, task.contact_name, task.assigned_to_name]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalized),
  )
}

export function groupTasks(tasks: CrmTask[], view: TaskView, now = new Date()): TaskGroup[] {
  if (view === 'completed') {
    return [{ key: 'completed', tasks }]
  }
  if (view === 'all') {
    return [{ key: 'all', tasks }]
  }
  if (view === 'upcoming') {
    return [{ key: 'upcoming', tasks }]
  }

  const endOfToday = new Date(now)
  endOfToday.setHours(24, 0, 0, 0)
  const overdue: CrmTask[] = []
  const today: CrmTask[] = []
  const upcoming: CrmTask[] = []
  for (const task of tasks) {
    const dueAt = new Date(task.due_at)
    if (task.effective_status === 'overdue' || dueAt < now) {
      overdue.push(task)
    } else if (dueAt < endOfToday) {
      today.push(task)
    } else {
      upcoming.push(task)
    }
  }
  return [
    { key: 'overdue', tasks: overdue },
    { key: 'today', tasks: today },
    { key: 'upcoming', tasks: upcoming },
  ].filter((group) => group.tasks.length > 0) as TaskGroup[]
}
