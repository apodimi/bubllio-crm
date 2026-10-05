import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ContactInput } from '../../../types/contact.types'
import { contactService } from '../services/contactService'
import type { ContactFilters } from '../services/contactService'

export const contactKeys = {
  byOrganization: (organizationId: string) =>
    ['organizations', organizationId, 'contacts'] as const,
  list: (organizationId: string, filters: ContactFilters) =>
    [...contactKeys.byOrganization(organizationId), filters] as const,
}

const contactsQuery = (organizationId: string, filters: ContactFilters) =>
  queryOptions({
    queryKey: contactKeys.list(organizationId, filters),
    queryFn: ({ signal }) => contactService.list(organizationId, filters, signal),
  })

export const useContacts = (organizationId: string, filters: ContactFilters = {}) =>
  useQuery(contactsQuery(organizationId, filters))

function useInvalidateContacts(organizationId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: contactKeys.byOrganization(organizationId) })
}

export const useCreateContact = (organizationId: string) => {
  const invalidate = useInvalidateContacts(organizationId)
  return useMutation({
    mutationFn: (body: ContactInput) => contactService.create(organizationId, body),
    onSuccess: invalidate,
  })
}

export const useUpdateContact = (organizationId: string, contactId: string) => {
  const invalidate = useInvalidateContacts(organizationId)
  return useMutation({
    mutationFn: (body: Partial<ContactInput>) =>
      contactService.update(organizationId, contactId, body),
    onSuccess: invalidate,
  })
}

export const useDeleteContact = (organizationId: string) => {
  const invalidate = useInvalidateContacts(organizationId)
  return useMutation({
    mutationFn: (contactId: string) => contactService.remove(organizationId, contactId),
    onSuccess: invalidate,
  })
}

export const useContactActivity = (organizationId: string, contactId: string) => useQuery({
  queryKey: [...contactKeys.byOrganization(organizationId), contactId, 'activity'],
  queryFn: ({ signal }) => contactService.activity(organizationId, contactId, signal),
  enabled: Boolean(contactId),
})

function useContactAction(organizationId: string, action: 'archive' | 'restore') {
  const invalidate = useInvalidateContacts(organizationId)
  return useMutation({ mutationFn: (contactId: string) => contactService[action](organizationId, contactId), onSuccess: invalidate })
}

export const useArchiveContact = (organizationId: string) => useContactAction(organizationId, 'archive')
export const useRestoreContact = (organizationId: string) => useContactAction(organizationId, 'restore')
