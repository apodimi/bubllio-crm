import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'
import type { Automation, AutomationRun } from '../../../types/automation.types'

export const automationService = {
  list: (organizationId: string, signal?: AbortSignal) =>
    request<Automation[]>(organizationPath(organizationId) + 'automations/', { signal }),
  listRuns: (organizationId: string, signal?: AbortSignal) =>
    request<AutomationRun[]>(organizationPath(organizationId) + 'automations/runs/', { signal }),
}
