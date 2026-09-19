import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { request } from '../services/api'


export function useCreateResource(path: string, invalidate: QueryKey, onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, string>) => request(path, { body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invalidate })
      onSuccess?.()
    },
  })
}
