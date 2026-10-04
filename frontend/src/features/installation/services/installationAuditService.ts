import { request } from '../../../services/api'
import type { InstallationAuditEvent } from '../../../types/auditEvent.types'

export const installationAuditService = {
  list: (signal?: AbortSignal) =>
    request<InstallationAuditEvent[]>('/installation/audit-log/', { signal }),
}
