import { useQuery } from '@tanstack/react-query'

import { ApiError } from '../../../services/api'
import { activityInboxService } from '../services/activityInboxService'

export const activityInboxKeys = {
  detail: (organizationId: string) => ['organizations', organizationId, 'activity-inbox'] as const,
}

export const useActivityInbox = (organizationId: string) =>
  useQuery({
    queryKey: activityInboxKeys.detail(organizationId),
    queryFn: async ({ signal }) => {
      try {
        return await activityInboxService.list(organizationId, signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: Boolean(organizationId),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
