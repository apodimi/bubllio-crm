import { queryOptions, useQuery } from '@tanstack/react-query'
import { contactService } from '../services/contactService'

export const contactKeys = {
  byOrganization: (organizationId: string) =>
    ['organizations', organizationId, 'contacts'] as const,
}

const contactsQuery = (organizationId: string) =>
  queryOptions({
    queryKey: contactKeys.byOrganization(organizationId),
    queryFn: ({ signal }) => contactService.list(organizationId, signal),
  })

export const useContacts = (organizationId: string) => useQuery(contactsQuery(organizationId))
