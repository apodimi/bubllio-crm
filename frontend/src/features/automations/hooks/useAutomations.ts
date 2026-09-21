import { queryOptions, useQuery } from '@tanstack/react-query'
import { automationService } from '../services/automationService'

export const automationKeys = {
  byOrganization: (organizationId: string) =>
    ['organizations', organizationId, 'automations'] as const,
  runs: (organizationId: string) => ['organizations', organizationId, 'runs'] as const,
}

const automationsQuery = (organizationId: string) =>
  queryOptions({
    queryKey: automationKeys.byOrganization(organizationId),
    queryFn: ({ signal }) => automationService.list(organizationId, signal),
  })

const automationRunsQuery = (organizationId: string) =>
  queryOptions({
    queryKey: automationKeys.runs(organizationId),
    queryFn: ({ signal }) => automationService.listRuns(organizationId, signal),
  })

export const useAutomations = (organizationId: string) => useQuery(automationsQuery(organizationId))
export const useAutomationRuns = (organizationId: string) =>
  useQuery(automationRunsQuery(organizationId))
