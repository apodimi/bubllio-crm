import type { Deal, DealStage } from '../../types/deal.types'

import { DEAL_STAGES } from './dealBoardConfig'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDeal(value: unknown): value is Deal {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.id === 'string' &&
    typeof value.stage === 'string' &&
    DEAL_STAGES.includes(value.stage as DealStage) &&
    typeof value.title === 'string' &&
    typeof value.company_name === 'string' &&
    typeof value.currency === 'string' &&
    typeof value.net_value === 'string' &&
    typeof value.lost_reason === 'string' &&
    (typeof value.expected_close_date === 'string' || value.expected_close_date === null) &&
    (typeof value.archived_at === 'string' || value.archived_at === null)
  )
}

export function dealFromDragData(data: unknown): Deal | undefined {
  if (!isRecord(data) || !isDeal(data.deal)) {
    return undefined
  }
  return data.deal
}

export function dealStageFromDragData(data: unknown): DealStage | undefined {
  if (!isRecord(data) || typeof data.stage !== 'string') {
    return undefined
  }
  return DEAL_STAGES.includes(data.stage as DealStage) ? (data.stage as DealStage) : undefined
}
