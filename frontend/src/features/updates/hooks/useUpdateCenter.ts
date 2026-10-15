import { useRef } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { updateService } from '../services/updateService'

const ACTIVE_RUN_STATES = new Set([
  'requested',
  'preflight',
  'backing_up',
  'deploying',
  'verifying',
])

export const updateCenterKeys = {
  all: ['installation-update-center'] as const,
  status: () => [...updateCenterKeys.all, 'status'] as const,
  run: (runId: string) => [...updateCenterKeys.all, 'run', runId] as const,
}

export function useUpdateCenterStatus(enabled: boolean) {
  return useQuery({
    queryKey: updateCenterKeys.status(),
    queryFn: ({ signal }) => updateService.centerStatus(signal),
    enabled,
    retry: 3,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    refetchInterval: (query) => {
      const status = query.state.data?.active_run?.status
      return status && ACTIVE_RUN_STATES.has(status) ? 2_000 : false
    },
    staleTime: 30_000,
  })
}

export function useUpdatePreflight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (targetVersion: string) => updateService.preflight(targetVersion),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: updateCenterKeys.status() })
    },
  })
}

export function useStartUpdate() {
  const queryClient = useQueryClient()
  const passwordRef = useRef<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({
      targetVersion,
      idempotencyKey,
    }: {
      targetVersion: string
      idempotencyKey: string
    }) => {
      const currentPassword = passwordRef.current
      passwordRef.current = null
      if (!currentPassword) {
        throw new Error('Current password is required')
      }
      return updateService.start(targetVersion, idempotencyKey, currentPassword)
    },
    onSuccess: async (run) => {
      queryClient.setQueryData(updateCenterKeys.run(run.id), run)
      await queryClient.invalidateQueries({ queryKey: updateCenterKeys.status() })
    },
  })

  return {
    ...mutation,
    mutateAsync: ({
      targetVersion,
      currentPassword,
    }: {
      targetVersion: string
      currentPassword: string
    }) => {
      passwordRef.current = currentPassword
      return mutation
        .mutateAsync({ targetVersion, idempotencyKey: crypto.randomUUID() })
        .finally(() => {
          passwordRef.current = null
        })
    },
  }
}

export function useUpdateRun(runId: string | null) {
  return useQuery({
    queryKey: updateCenterKeys.run(runId ?? 'none'),
    queryFn: ({ signal }) => updateService.run(runId as string, signal),
    enabled: Boolean(runId),
    retry: 5,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && ACTIVE_RUN_STATES.has(status) ? 2_000 : false
    },
  })
}
