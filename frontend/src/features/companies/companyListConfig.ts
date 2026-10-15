import type { Company } from '../../types/company.types'

export const COMPANY_VIEWS = ['active', 'mine', 'unassigned', 'archived'] as const
export const COMPANY_STAGES = ['lead', 'prospect', 'customer', 'inactive'] as const
export const COMPANY_SORTS = ['-updated_at', 'updated_at', 'name', '-created_at'] as const

export type CompanyView = (typeof COMPANY_VIEWS)[number]
export type CompanyStage = (typeof COMPANY_STAGES)[number]
export type CompanySort = (typeof COMPANY_SORTS)[number]

export interface CompanySearchPatch {
  q?: string
  view?: CompanyView
  stage?: Company['lifecycle_stage']
  owner?: string
  sort?: CompanySort
  page?: number
  company?: string
  create?: true
}

export type CompanyInlineField = 'stage' | 'owner'

export interface CompanyInlineEdit {
  anchor: HTMLElement
  company: Company
  field: CompanyInlineField
}

export interface CompanyActionsState {
  anchor: HTMLElement
  company: Company
}

export const COMPANY_SORT_TRANSLATION_KEYS: Record<
  CompanySort,
  | 'crm.companies.sortUpdatedDesc'
  | 'crm.companies.sortUpdatedAsc'
  | 'crm.companies.sortNameAsc'
  | 'crm.companies.sortCreatedDesc'
> = {
  '-updated_at': 'crm.companies.sortUpdatedDesc',
  updated_at: 'crm.companies.sortUpdatedAsc',
  name: 'crm.companies.sortNameAsc',
  '-created_at': 'crm.companies.sortCreatedDesc',
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number] {
  return typeof value === 'string' && options.includes(value)
}

function positiveInteger(value: unknown) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined
  }
  return parsed
}

export function parseCompanySearch(search: Record<string, unknown>): CompanySearchPatch {
  return {
    ...(typeof search.company === 'string' ? { company: search.company } : {}),
    ...(search.create === true || search.create === 'true' ? { create: true as const } : {}),
    ...(typeof search.q === 'string' && search.q.trim() ? { q: search.q } : {}),
    ...(isOneOf(search.view, COMPANY_VIEWS) ? { view: search.view } : {}),
    ...(isOneOf(search.stage, COMPANY_STAGES) ? { stage: search.stage } : {}),
    ...(search.owner === 'unassigned' || positiveInteger(search.owner)
      ? { owner: String(search.owner) }
      : {}),
    ...(isOneOf(search.sort, COMPANY_SORTS) ? { sort: search.sort } : {}),
    ...(positiveInteger(search.page) ? { page: positiveInteger(search.page) } : {}),
  }
}
