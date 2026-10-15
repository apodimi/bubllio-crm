import type { Contact } from '../../types/contact.types'

export const CONTACT_VIEWS = ['active', 'all', 'archived'] as const

export type ContactView = (typeof CONTACT_VIEWS)[number]

export interface ContactSearchPatch {
  q?: string
  view?: ContactView
  company?: string
  page?: number
  contact?: string
  create?: true
}

export interface ContactActionsState {
  anchor: HTMLElement
  contact: Contact
}

function isContactView(value: unknown): value is ContactView {
  return typeof value === 'string' && CONTACT_VIEWS.includes(value as ContactView)
}

function positiveInteger(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function parseContactSearch(search: Record<string, unknown>): ContactSearchPatch {
  const page = positiveInteger(search.page)
  return {
    ...(typeof search.contact === 'string' ? { contact: search.contact } : {}),
    ...(search.create === true || search.create === 'true' ? { create: true as const } : {}),
    ...(typeof search.q === 'string' && search.q.trim() ? { q: search.q } : {}),
    ...(isContactView(search.view) ? { view: search.view } : {}),
    ...(typeof search.company === 'string' && search.company ? { company: search.company } : {}),
    ...(page ? { page } : {}),
  }
}
