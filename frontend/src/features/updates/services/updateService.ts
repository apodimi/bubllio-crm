import { request } from '../../../services/api'
import type { InstallationUpdateStatus } from '../../../types/update.types'

export const updateService = {
  status: (signal?: AbortSignal) =>
    request<InstallationUpdateStatus>('/installation/update-status/', { signal }),
}
