import type { TaskKind } from '../../types/task.types'
import type { TaskView } from './taskListConfig'

export const TASK_VIEWS: TaskView[] = ['focus', 'upcoming', 'all', 'completed']
export const TASK_OWNERS = ['me', 'all', 'unassigned'] as const
export const TASK_KINDS: Array<TaskKind | 'all'> = ['all', 'task', 'call', 'email', 'meeting']

export interface TaskSearch {
  view?: TaskView
  owner?: (typeof TASK_OWNERS)[number]
  kind?: TaskKind | 'all'
  q?: string
  create?: true
}

function includes<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && options.includes(value as T)
}

export function parseTaskSearch(search: Record<string, unknown>): TaskSearch {
  return {
    ...(includes(TASK_VIEWS, search.view) ? { view: search.view } : {}),
    ...(includes(TASK_OWNERS, search.owner) ? { owner: search.owner } : {}),
    ...(includes(TASK_KINDS, search.kind) ? { kind: search.kind } : {}),
    ...(typeof search.q === 'string' && search.q.trim() ? { q: search.q } : {}),
    ...(search.create === true || search.create === 'true' ? { create: true as const } : {}),
  }
}
