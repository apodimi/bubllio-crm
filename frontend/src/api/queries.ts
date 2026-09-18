import { queryOptions } from '@tanstack/react-query'
import { request } from './client'
import type { Organization, Company, Contact, Automation, AutomationRun } from './types'

export const organizationPath = (id: string) => '/organizations/' + encodeURIComponent(id) + '/'
export const keys = {
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organizations', id] as const,
  companies: (id: string) => ['organizations', id, 'companies'] as const,
  contacts: (id: string) => ['organizations', id, 'contacts'] as const,
  automations: (id: string) => ['organizations', id, 'automations'] as const,
  runs: (id: string) => ['organizations', id, 'runs'] as const,
}
export const organizationsQuery = queryOptions({
  queryKey: keys.organizations, queryFn: ({ signal }) => request<Organization[]>('/organizations/', { signal }),
})
export const organizationQuery = (id: string) => queryOptions({
  queryKey: keys.organization(id), queryFn: ({ signal }) => request<Organization>(organizationPath(id), { signal }),
})
export const companiesQuery = (id: string) => queryOptions({
  queryKey: keys.companies(id), queryFn: ({ signal }) => request<Company[]>(organizationPath(id) + 'companies/', { signal }),
})
export const contactsQuery = (id: string) => queryOptions({
  queryKey: keys.contacts(id), queryFn: ({ signal }) => request<Contact[]>(organizationPath(id) + 'contacts/', { signal }),
})
export const automationsQuery = (id: string) => queryOptions({
  queryKey: keys.automations(id), queryFn: ({ signal }) => request<Automation[]>(organizationPath(id) + 'automations/', { signal }),
})
export const runsQuery = (id: string) => queryOptions({
  queryKey: keys.runs(id), queryFn: ({ signal }) => request<AutomationRun[]>(organizationPath(id) + 'automations/runs/', { signal }),
})
