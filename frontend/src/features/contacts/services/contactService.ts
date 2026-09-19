import { request } from '../../../services/api'
import { organizationPath } from '../../organizations/services/organizationService'
import type { Contact } from '../../../types/contact.types'

export const contactService = {
  list: (organizationId: string, signal?: AbortSignal) =>
    request<Contact[]>(organizationPath(organizationId) + 'contacts/', { signal }),
}
