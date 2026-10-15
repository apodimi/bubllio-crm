import type { Deal, DealStage } from '../../types/deal.types'

export const DEAL_VIEWS = ['active', 'all', 'archived'] as const
export const DEAL_STAGES: DealStage[] = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

export type DealView = (typeof DEAL_VIEWS)[number]

export interface DealSearchPatch {
  q?: string
  view?: DealView
  stage?: DealStage
  deal?: string
  create?: true
}

export interface DealActionsState {
  anchor: HTMLElement
  deal: Deal
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number] {
  return typeof value === 'string' && options.includes(value)
}

export function parseDealSearch(search: Record<string, unknown>): DealSearchPatch {
  return {
    ...(typeof search.deal === 'string' ? { deal: search.deal } : {}),
    ...(search.create === true || search.create === 'true' ? { create: true as const } : {}),
    ...(typeof search.q === 'string' && search.q.trim() ? { q: search.q } : {}),
    ...(isOneOf(search.view, DEAL_VIEWS) ? { view: search.view } : {}),
    ...(isOneOf(search.stage, DEAL_STAGES) ? { stage: search.stage } : {}),
  }
}
