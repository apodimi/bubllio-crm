import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { activityInboxKeys } from '../../activity-inbox'
import type { TaskInput, TaskUpdateInput, TaskWorkflowStatus } from '../../../types/task.types'
import { taskService } from '../services/taskService'
import type { TaskFilters } from '../services/taskService'

export const taskKeys = {
  byOrganization: (organizationId: string) => ['organizations', organizationId, 'tasks'] as const,
  list: (organizationId: string, filters: TaskFilters) =>
    [...taskKeys.byOrganization(organizationId), filters] as const,
}

export const useTasks = (
  organizationId: string,
  filters: TaskFilters = {},
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: taskKeys.list(organizationId, filters),
    queryFn: ({ signal }) => taskService.list(organizationId, filters, signal),
    enabled: options.enabled,
  })

function useInvalidateTasks(organizationId: string) {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: taskKeys.byOrganization(organizationId) }),
      client.invalidateQueries({ queryKey: activityInboxKeys.detail(organizationId) }),
    ])
  }
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
    mutationFn: (body: TaskUpdateInput) => taskService.update(organizationId, taskId, body),
    onSuccess: invalidate,
  })
}

export function useRescheduleTask(organizationId: string) {
  const invalidate = useInvalidateTasks(organizationId)
  return useMutation({
    mutationFn: ({ taskId, dueAt }: { taskId: string; dueAt: string }) =>
      taskService.update(organizationId, taskId, { due_at: dueAt }),
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

export function useMoveTask(organizationId: string) {
  const invalidate = useInvalidateTasks(organizationId)
  return useMutation({
    mutationFn: ({
      taskId,
      workflowStatus,
    }: {
      taskId: string
      workflowStatus: TaskWorkflowStatus
    }) => taskService.move(organizationId, taskId, workflowStatus),
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
