import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import type { Contact } from '../../../types/contact.types'
import { useCompanies } from '../../companies'
import { canCreateRecords, useWorkspace } from '../../organizations'
import type { ContactActionsState, ContactSearchPatch, ContactView } from '../contactListConfig'
import {
  useArchiveContact,
  useContact,
  useContactPage,
  useDeleteContact,
  useRestoreContact,
} from './useContacts'

export function useContactListController() {
  const org = useWorkspace()
  const navigate = useNavigate({ from: '/organizations/$organizationId/contacts' })
  const routeSearch = useSearch({ from: '/organizations/$organizationId/contacts' })
  const canManage = canCreateRecords(org)
  const view: ContactView = routeSearch.view ?? 'active'
  const search = routeSearch.q ?? ''
  const company = routeSearch.company ?? ''
  const page = routeSearch.page ?? 1
  const deferredSearch = useDebouncedValue(search)
  const companies = useCompanies(org.id)
  const query = useContactPage(
    org.id,
    {
      search: deferredSearch,
      company,
      archived: view,
    },
    page - 1,
  )
  const routeContact = useContact(org.id, routeSearch.contact ?? '')
  const archive = useArchiveContact(org.id)
  const restore = useRestoreContact(org.id)
  const remove = useDeleteContact(org.id)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [companyPreview, setCompanyPreview] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const [filtersAnchor, setFiltersAnchor] = useState<HTMLElement | null>(null)
  const [actionsMenu, setActionsMenu] = useState<ContactActionsState | null>(null)

  const hasFilters = Boolean(search || company || view !== 'active')
  const companyName = companies.data?.find((item) => item.id === company)?.name ?? company
  const error = query.error || companies.error

  function updateSearch(patch: ContactSearchPatch) {
    void navigate({ replace: true, search: { ...routeSearch, ...patch } })
  }

  function clearFilters() {
    updateSearch({ q: undefined, view: undefined, company: undefined, page: undefined })
  }

  function selectView(nextView: ContactView) {
    updateSearch({ view: nextView === 'active' ? undefined : nextView, page: undefined })
  }

  function closeCreate() {
    updateSearch({ create: undefined })
  }

  function closeActions() {
    setActionsMenu(null)
  }

  function runArchive(contact: Contact) {
    archive.mutate(contact.id, { onSuccess: closeActions })
  }

  function runRestore(contact: Contact) {
    restore.mutate(contact.id, { onSuccess: closeActions })
  }

  return {
    org,
    routeSearch,
    canManage,
    view,
    search,
    company,
    companyName,
    page,
    query,
    rows: query.data ?? [],
    companies,
    routeContact,
    archive,
    restore,
    remove,
    hasFilters,
    editing,
    companyPreview,
    deleting,
    filtersAnchor,
    actionsMenu,
    error,
    updateSearch,
    clearFilters,
    selectView,
    closeCreate,
    closeActions,
    runArchive,
    runRestore,
    setEditing,
    setCompanyPreview,
    setDeleting,
    setFiltersAnchor,
    setActionsMenu,
  }
}
