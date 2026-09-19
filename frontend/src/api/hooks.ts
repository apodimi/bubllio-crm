import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { request } from './client'
import { automationsQuery, companiesQuery, contactsQuery, organizationQuery, organizationsQuery, runsQuery } from './queries'

export const useOrganizations = () => useQuery(organizationsQuery)
export const useOrganization = (id: string) => useQuery(organizationQuery(id))
export const useCompanies = (id: string) => useQuery(companiesQuery(id))
export const useContacts = (id: string) => useQuery(contactsQuery(id))
export const useAutomations = (id: string) => useQuery(automationsQuery(id))
export const useAutomationRuns = (id: string) => useQuery(runsQuery(id))

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
