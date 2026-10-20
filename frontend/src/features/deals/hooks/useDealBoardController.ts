import { useMemo, useState } from 'react'
import {
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import type { Deal, DealStage } from '../../../types/deal.types'
import type { CrmTask } from '../../../types/task.types'
import { useCompanies } from '../../companies'
import { canCreateRecords, useWorkspace } from '../../organizations'
import { useTasks } from '../../tasks'
import {
  DEAL_STAGES,
  type DealActionsState,
  type DealSearchPatch,
  type DealView,
} from '../dealBoardConfig'
import { dealFromDragData, dealStageFromDragData } from '../dealBoardDnd'
import type { DealFilters } from '../services/dealService'
import { useArchiveDeal, useDeal, useDeals, useDeleteDeal, useMoveDeal } from './useDeals'

interface DealDrawerState {
  deal?: Deal
  initialStage?: DealStage
}

interface NextActionDrawerState {
  deal: Deal
  task?: CrmTask
}

export function useDealBoardController() {
  const org = useWorkspace()
  const navigate = useNavigate({ from: '/organizations/$organizationId/deals' })
  const routeSearch = useSearch({ from: '/organizations/$organizationId/deals' })
  const canManage = canCreateRecords(org)
  const view: DealView = routeSearch.view ?? 'active'
  const search = routeSearch.q ?? ''
  const stage: DealStage | '' = routeSearch.stage ?? ''
  const deferredSearch = useDebouncedValue(search)
  const viewFilters = useMemo<DealFilters>(() => {
    if (view === 'mine') return { archived: 'active', assignedTo: 'me' }
    if (view === 'no_next_action') return { archived: 'active', nextAction: 'missing' }
    if (view === 'closing_this_month') {
      const now = new Date()
      const format = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      return {
        archived: 'active',
        expectedCloseFrom: format(new Date(now.getFullYear(), now.getMonth(), 1)),
        expectedCloseTo: format(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    }
    return { archived: view }
  }, [view])
  const filters = useMemo<DealFilters>(
    () => ({ search: deferredSearch, stage, ...viewFilters }),
    [deferredSearch, stage, viewFilters],
  )
  const deals = useDeals(org.id, filters)
  const companies = useCompanies(org.id, { archived: 'active' })
  const needsTaskContext = view === 'active' || view === 'all' || view === 'archived'
  const tasks = useTasks(org.id, { bucket: 'open' }, { enabled: needsTaskContext })
  const routeDeal = useDeal(org.id, routeSearch.deal ?? '')
  const move = useMoveDeal(org.id, filters)
  const archive = useArchiveDeal(org.id)
  const remove = useDeleteDeal(org.id)
  const [drawer, setDrawer] = useState<DealDrawerState | null>(null)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [filtersAnchor, setFiltersAnchor] = useState<HTMLElement | null>(null)
  const [actionsMenu, setActionsMenu] = useState<DealActionsState | null>(null)
  const [deleting, setDeleting] = useState<Deal | null>(null)
  const [nextActionDrawer, setNextActionDrawer] = useState<NextActionDrawerState | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const rows = useMemo(() => deals.data ?? [], [deals.data])
  const canMove = canManage && view === 'active' && !search && !stage
  const visibleStages = stage ? [stage] : DEAL_STAGES
  const hasFilters = Boolean(search || stage || view !== 'active')
  const taskRows = tasks.data
  const nextActionByDeal = useMemo(() => {
    const result = new Map<string, NonNullable<typeof taskRows>[number]>()
    for (const task of taskRows ?? []) {
      if (task.deal && !result.has(task.deal)) {
        result.set(task.deal, task)
      }
    }
    return result
  }, [taskRows])
  const forecasts = useMemo(() => {
    const open = rows.filter((deal) => !['won', 'lost'].includes(deal.stage))
    const totals = new Map<string, { currency: string; total: number; weighted: number }>()
    for (const deal of open) {
      const current = totals.get(deal.currency) ?? {
        currency: deal.currency,
        total: 0,
        weighted: 0,
      }
      current.total += Number(deal.net_value)
      current.weighted += (Number(deal.net_value) * deal.probability) / 100
      totals.set(deal.currency, current)
    }
    return {
      open,
      withoutNextAction: open.filter((deal) => !nextActionByDeal.has(deal.id)).length,
      totals: Array.from(totals.values()),
    }
  }, [nextActionByDeal, rows])

  function updateSearch(patch: DealSearchPatch) {
    void navigate({ replace: true, search: { ...routeSearch, ...patch } })
  }

  function clearFilters() {
    updateSearch({ q: undefined, view: undefined, stage: undefined })
  }

  function selectView(nextView: DealView) {
    updateSearch({ view: nextView === 'active' ? undefined : nextView })
  }

  function laneDeals(laneStage: DealStage) {
    return rows
      .filter((deal) => deal.stage === laneStage)
      .toSorted((a, b) => a.sort_order - b.sort_order)
  }

  function dragStart(event: DragStartEvent) {
    if (!canMove) {
      return
    }
    setActiveDeal(dealFromDragData(event.active.data.current) ?? null)
  }

  function dragEnd(event: DragEndEvent) {
    setActiveDeal(null)
    if (!canMove) {
      return
    }
    const deal = dealFromDragData(event.active.data.current)
    const targetStage = dealStageFromDragData(event.over?.data.current)
    if (!deal || !targetStage || !event.over) {
      return
    }
    const targetLane = laneDeals(targetStage)
    const destination = targetLane.filter((item) => item.id !== deal.id)
    const overDeal = dealFromDragData(event.over.data.current)
    if (overDeal?.id === deal.id) {
      return
    }
    const targetIndex = overDeal
      ? targetLane.findIndex((item) => item.id === overDeal.id)
      : destination.length
    if (targetStage === 'lost' && !deal.lost_reason) {
      setDrawer({ deal, initialStage: 'lost' })
      return
    }
    move.mutate({
      id: deal.id,
      stage: targetStage,
      position: targetIndex < 0 ? destination.length : targetIndex,
    })
  }

  function closeActions() {
    setActionsMenu(null)
  }

  function toggleArchive(deal: Deal) {
    archive.mutate(deal.id, { onSuccess: closeActions })
  }

  return {
    org,
    routeSearch,
    canManage,
    view,
    search,
    stage,
    filters,
    deals,
    companies,
    tasks,
    routeDeal,
    move,
    archive,
    remove,
    rows,
    canMove,
    visibleStages,
    hasFilters,
    nextActionByDeal,
    forecasts,
    drawer,
    activeDeal,
    filtersAnchor,
    actionsMenu,
    deleting,
    nextActionDrawer,
    sensors,
    collisionDetection: closestCorners,
    updateSearch,
    clearFilters,
    selectView,
    laneDeals,
    dragStart,
    dragEnd,
    closeActions,
    toggleArchive,
    setDrawer,
    setActiveDeal,
    setFiltersAnchor,
    setActionsMenu,
    setDeleting,
    setNextActionDrawer,
  }
}
