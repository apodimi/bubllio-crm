import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import type { Company } from '../../../types/company.types'
import { useAuthStore } from '../../auth/store/authStore'
import { canCreateRecords, useWorkspace } from '../../organizations'
import {
  type CompanySearchPatch,
  type CompanyActionsState,
  type CompanyInlineEdit,
  type CompanyInlineField,
  type CompanySort,
  type CompanyView,
} from '../companyListConfig'
import type { CompanyFilters } from '../services/companyService'
import {
  useArchiveCompany,
  useCompanyAssignees,
  useCompanyPage,
  useQuickUpdateCompany,
  useRestoreCompany,
} from './useCompanies'

export function useCompanyListController() {
  const { t, i18n } = useTranslation()
  const org = useWorkspace()
  const navigate = useNavigate({ from: '/organizations/$organizationId/companies' })
  const routeSearch = useSearch({ from: '/organizations/$organizationId/companies' })
  const currentUserId = useAuthStore((state) => state.user?.id)
  const canManage = canCreateRecords(org)
  const view: CompanyView = routeSearch.view ?? 'active'
  const stage: Company['lifecycle_stage'] | '' = routeSearch.stage ?? ''
  const owner = routeSearch.owner ?? ''
  const ordering: CompanySort = routeSearch.sort ?? '-updated_at'
  const page = routeSearch.page ?? 1
  const search = routeSearch.q ?? ''
  const deferredSearch = useDebouncedValue(search)
  const [create, setCreate] = useState(routeSearch.create === true)
  const [editing, setEditing] = useState<Company | null>(null)
  const [archiving, setArchiving] = useState<Company | null>(null)
  const [filtersAnchor, setFiltersAnchor] = useState<HTMLElement | null>(null)
  const [inlineEdit, setInlineEdit] = useState<CompanyInlineEdit | null>(null)
  const [actionsMenu, setActionsMenu] = useState<CompanyActionsState | null>(null)
  const archive = useArchiveCompany(org.id)
  const restore = useRestoreCompany(org.id)
  const quickUpdate = useQuickUpdateCompany(org.id)
  const assignees = useCompanyAssignees(org.id, canManage)

  let assignedTo: number | 'unassigned' | '' = ''
  if (view === 'mine' && currentUserId) {
    assignedTo = currentUserId
  } else if (view === 'unassigned' || owner === 'unassigned') {
    assignedTo = 'unassigned'
  } else if (owner) {
    assignedTo = Number(owner)
  }

  const archived = view === 'archived' ? 'archived' : 'active'
  const filters = useMemo<CompanyFilters>(
    () => ({
      search: deferredSearch,
      lifecycleStage: stage,
      archived,
      assignedTo,
      ordering,
    }),
    [archived, assignedTo, deferredSearch, ordering, stage],
  )
  const query = useCompanyPage(org.id, filters, page - 1)
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }),
    [i18n.resolvedLanguage],
  )
  const advancedFilterCount =
    Number(Boolean(stage)) + Number(Boolean(owner)) + Number(Boolean(routeSearch.sort))
  const hasFilters = Boolean(search || stage || owner || routeSearch.sort || view !== 'active')

  function updateSearch(patch: CompanySearchPatch) {
    void navigate({ replace: true, search: { ...routeSearch, ...patch } })
  }

  function clearFilters() {
    updateSearch({
      q: undefined,
      view: undefined,
      stage: undefined,
      owner: undefined,
      sort: undefined,
      page: undefined,
    })
  }

  function selectView(nextView: CompanyView) {
    updateSearch({
      view: nextView === 'active' ? undefined : nextView,
      owner: undefined,
      page: undefined,
    })
  }

  function openInlineEdit(
    event: MouseEvent<HTMLElement>,
    company: Company,
    field: CompanyInlineField,
  ) {
    event.stopPropagation()
    setInlineEdit({ anchor: event.currentTarget, company, field })
  }

  function updateInline(body: Partial<Pick<Company, 'lifecycle_stage' | 'assigned_to'>>) {
    if (!inlineEdit) {
      return
    }
    quickUpdate.mutate(
      { companyId: inlineEdit.company.id, body },
      { onSuccess: () => setInlineEdit(null) },
    )
  }

  function ownerLabel(value: string) {
    if (value === 'unassigned') {
      return t('crm.companies.unassigned')
    }
    if (Number(value) === currentUserId) {
      return t('crm.companies.mine')
    }
    return assignees.data?.find((person) => person.id === Number(value))?.name ?? value
  }

  function changeOwner(nextOwner?: string) {
    const nextView = view === 'mine' || view === 'unassigned' ? undefined : routeSearch.view
    updateSearch({ owner: nextOwner, view: nextView, page: undefined })
  }

  function closeCreate() {
    setCreate(false)
    if (routeSearch.create) {
      updateSearch({ create: undefined })
    }
  }

  return {
    org,
    routeSearch,
    currentUserId,
    canManage,
    view,
    stage,
    owner,
    ordering,
    page,
    search,
    query,
    rows: query.data ?? [],
    dateFormatter,
    advancedFilterCount,
    hasFilters,
    create,
    editing,
    archiving,
    filtersAnchor,
    inlineEdit,
    actionsMenu,
    archive,
    restore,
    quickUpdate,
    assignees,
    updateSearch,
    clearFilters,
    selectView,
    openInlineEdit,
    updateInline,
    ownerLabel,
    changeOwner,
    closeCreate,
    setCreate,
    setEditing,
    setArchiving,
    setFiltersAnchor,
    setInlineEdit,
    setActionsMenu,
  }
}
