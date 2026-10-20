import { request } from '../../../services/api'
import type { ActivityInboxResponse } from '../../../types/activityInbox.types'

export const activityInboxService = {
  list: (organizationId: string, signal?: AbortSignal) =>
    request<ActivityInboxResponse>(`/organizations/${organizationId}/activity-inbox/`, { signal }),
}
