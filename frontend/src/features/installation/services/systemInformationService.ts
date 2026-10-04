import { request } from '../../../services/api'
import type { SystemInformation } from '../../../types/systemInformation.types'

export const systemInformationService = {
  get: (signal?: AbortSignal) =>
    request<SystemInformation>('/installation/system-information/', { signal }),
}
