import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TaskInput } from '../../../types/task.types'
import { taskService } from '../services/taskService'
import type { TaskFilters } from '../services/taskService'

export const taskKeys = {
  byOrganization: (organizationId: string) => ['organizations', organizationId, 'tasks'] as const,
  list: (organizationId: string, filters: TaskFilters) =>
    [...taskKeys.byOrganization(organizationId), filters] as const,
}

export const useTasks = (organizationId: string, filters: TaskFilters = {}) =>
  useQuery({
    queryKey: taskKeys.list(organizationId, filters),
    queryFn: ({ signal }) => taskService.list(organizationId, filters, signal),
  })

function useInvalidateTasks(organizationId: string) {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: taskKeys.byOrganization(organizationId) })
}

export function useCreateTask(organizationId: string) {
  const invalidate = useInvalidateTasks(organizationId)
  return useMutation({
    mutationFn: (body: TaskInput) => taskService.create(organizationId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateTask(organizationId: string, taskId: string) {
  const invalidate = useInvalidateTasks(organizationId)
  return useMutation({
    mutationFn: (body: Partial<TaskInput>) => taskService.update(organizationId, taskId, body),
    onSuccess: invalidate,
  })
}

export function useCompleteTask(organizationId: string) {
  const invalidate = useInvalidateTasks(organizationId)
  return useMutation({
    mutationFn: (taskId: string) => taskService.complete(organizationId, taskId),
    onSuccess: invalidate,
  })
}

export function useReopenTask(organizationId: string) {
  const invalidate = useInvalidateTasks(organizationId)
  return useMutation({
    mutationFn: (taskId: string) => taskService.reopen(organizationId, taskId),
    onSuccess: invalidate,
  })
}

export function useDeleteTask(organizationId: string) {
  const invalidate = useInvalidateTasks(organizationId)
  return useMutation({
    mutationFn: (taskId: string) => taskService.remove(organizationId, taskId),
    onSuccess: invalidate,
  })
}
