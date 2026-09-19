import { request } from '../../../services/api'
import type { Organization } from '../../../types/organization.types'

export const organizationPath = (id: string) => '/organizations/' + encodeURIComponent(id) + '/'

export const organizationService = {
  list: (signal?: AbortSignal) => request<Organization[]>('/organizations/', { signal }),
  get: (id: string, signal?: AbortSignal) => request<Organization>(organizationPath(id), { signal }),
}
