import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'
import type { Contact, ContactActivity, ContactInput } from '../../../types/contact.types'
import type { PageResult } from '../../../types/pagination.types'

export interface ContactFilters {
  search?: string
  company?: string
  archived?: 'active' | 'archived' | 'all'
}

const contactPath = (organizationId: string, contactId?: string) =>
  organizationPath(organizationId) +
  'contacts/' +
  (contactId ? encodeURIComponent(contactId) + '/' : '')

export const contactService = {
  page: (organizationId: string, filters: ContactFilters, page: number, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page + 1), page_size: '50' })
    if (filters.search?.trim()) params.set('search', filters.search.trim())
    if (filters.company) params.set('company', filters.company)
    if (filters.archived) params.set('archived', filters.archived)
    return request<PageResult<Contact>>(contactPath(organizationId) + '?' + params, { signal })
  },
  list: (organizationId: string, filters: ContactFilters = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (filters.search?.trim()) params.set('search', filters.search.trim())
    if (filters.company) params.set('company', filters.company)
    if (filters.archived) params.set('archived', filters.archived)
    const query = params.toString()
    return request<Contact[]>(contactPath(organizationId) + (query ? `?${query}` : ''), { signal })
  },
  get: (organizationId: string, contactId: string, signal?: AbortSignal) =>
    request<Contact>(contactPath(organizationId, contactId), { signal }),
  create: (organizationId: string, body: ContactInput) =>
    request<Contact>(contactPath(organizationId), { body }),
  update: (organizationId: string, contactId: string, body: Partial<ContactInput>) =>
    request<Contact>(contactPath(organizationId, contactId), { method: 'PATCH', body }),
  remove: (organizationId: string, contactId: string) =>
    request<void>(contactPath(organizationId, contactId), { method: 'DELETE' }),
  activity: (organizationId: string, contactId: string, signal?: AbortSignal) =>
    request<ContactActivity[]>(contactPath(organizationId, contactId) + 'activity/', { signal }),
  archive: (organizationId: string, contactId: string) =>
    request<Contact>(contactPath(organizationId, contactId) + 'archive/', { method: 'POST' }),
  restore: (organizationId: string, contactId: string) =>
    request<Contact>(contactPath(organizationId, contactId) + 'restore/', { method: 'POST' }),
}
