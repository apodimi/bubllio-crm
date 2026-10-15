import { useEffect, useRef, type ReactNode } from 'react'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { Alert, Box, Button, Drawer, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { Failure, Loading } from '../../components/common/Feedback'
import {
  ActiveDealFilters,
  DealBoardToolbar,
  DealFiltersPopover,
  DealViewTabs,
} from '../../features/deals/components/DealBoardControls'
import {
  DealActionsMenu,
  DeleteDealDialog,
} from '../../features/deals/components/DealBoardOverlays'
import { DealDragPreview } from '../../features/deals/components/DealCard'
import { DealLane } from '../../features/deals/components/DealLane'
import { useDealBoardController } from '../../features/deals/hooks/useDealBoardController'
import { TaskDrawer } from '../../features/tasks/components/TaskDrawer'
import { DealDrawer } from './DealDrawer'

interface ForecastSummary {
  open: unknown[]
  withoutNextAction: number
  totals: Array<{ currency: string; total: number; weighted: number }>
}

function DealBoardSummary({ forecast }: { forecast: ForecastSummary }) {
  const { t, i18n } = useTranslation()
  return (
    <Stack
      direction="row"
      spacing={{ xs: 1.5, sm: 2.5 }}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 750 }}>
          {forecast.open.length}
        </Box>{' '}
        {t('crm.deals.openDeals')}
      </Typography>
      <Typography
        variant="body2"
        color={forecast.withoutNextAction ? 'warning.main' : 'text.secondary'}
      >
        <Box component="span" sx={{ fontWeight: 750 }}>
          {forecast.withoutNextAction}
        </Box>{' '}
        {t('crm.deals.withoutNextAction')}
      </Typography>
      {forecast.totals.map((item) => {
        const money = new Intl.NumberFormat(i18n.resolvedLanguage, {
          style: 'currency',
          currency: item.currency,
          maximumFractionDigits: 0,
        })
        return (
          <Stack key={item.currency} direction="row" spacing={1.5} useFlexGap>
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 750 }}>
                {money.format(item.total)}
              </Box>{' '}
              {t('crm.deals.netPipeline')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 750 }}>
                {money.format(item.weighted)}
              </Box>{' '}
              {t('crm.deals.weightedForecast')}
            </Typography>
          </Stack>
        )
      })}
    </Stack>
  )
}

export function DealsPage() {
  const { t } = useTranslation()
  const boardRef = useRef<HTMLDivElement | null>(null)
  const {
    org,
    routeSearch,
    canManage,
    view,
    search,
    stage,
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
    collisionDetection,
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
  } = useDealBoardController()
  const error = deals.error || companies.error || tasks.error
  const isPending = deals.isPending || companies.isPending || tasks.isPending

  useEffect(() => {
    const board = boardRef.current
    if (!board || !rows.length || !window.matchMedia('(max-width: 899px)').matches) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      const firstPopulatedLane = board.querySelector<HTMLElement>('[data-has-deals="true"]')
      if (firstPopulatedLane) {
        board.scrollTo({ left: firstPopulatedLane.offsetLeft - board.offsetLeft })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [rows])

  let emptyAction: ReactNode = null
  if (hasFilters) {
    emptyAction = (
      <Button variant="outlined" onClick={clearFilters}>
        {t('crm.deals.clearFilters')}
      </Button>
    )
  } else if (canManage && companies.data?.length) {
    emptyAction = (
      <Button
        variant="contained"
        startIcon={<AppIcon icon={plusIcon} />}
        onClick={() => updateSearch({ create: true })}
      >
        {t('crm.deals.add')}
      </Button>
    )
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Typography variant="h2" component="h1">
              {t('crm.deals.title')}
            </Typography>
            {!deals.isPending ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t('crm.deals.count', { count: rows.length })}
              </Typography>
            ) : null}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: '68ch' }}>
            {t('crm.deals.description')}
          </Typography>
        </Box>
        {canManage ? (
          <Button
            variant="contained"
            startIcon={<AppIcon icon={plusIcon} />}
            disabled={!companies.data?.length}
            onClick={() => updateSearch({ create: true })}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            {t('crm.deals.add')}
          </Button>
        ) : null}
      </Stack>

      <Box component="section" aria-label={t('crm.deals.title')} sx={{ minWidth: 0 }}>
        <DealViewTabs value={view} onChange={selectView} />
        <DealBoardToolbar
          search={search}
          filterCount={Number(Boolean(stage))}
          filtersOpen={Boolean(filtersAnchor)}
          onSearchChange={(value) => updateSearch({ q: value || undefined })}
          onOpenFilters={setFiltersAnchor}
        />
        <ActiveDealFilters
          stage={stage}
          onClearStage={() => updateSearch({ stage: undefined })}
          onClearAll={clearFilters}
        />

        {move.isError || archive.isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(move.error || archive.error)?.message}
          </Alert>
        ) : null}
        {isPending ? (
          <Loading />
        ) : error ? (
          <Failure
            error={error}
            retry={() => {
              void deals.refetch()
              void companies.refetch()
              void tasks.refetch()
            }}
          />
        ) : rows.length === 0 ? (
          <Stack
            spacing={1.5}
            sx={{ px: 3, py: { xs: 5, md: 7 }, textAlign: 'center', alignItems: 'center' }}
          >
            <Typography variant="h6">
              {hasFilters ? t('crm.deals.noMatches') : t('crm.deals.empty')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '65ch' }}>
              {hasFilters ? t('crm.deals.noMatchesDescription') : t('crm.deals.emptyDescription')}
            </Typography>
            {emptyAction}
          </Stack>
        ) : (
          <>
            <DealBoardSummary forecast={forecasts} />
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={dragStart}
              onDragCancel={() => setActiveDeal(null)}
              onDragEnd={dragEnd}
            >
              <Box
                ref={boardRef}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: `repeat(${visibleStages.length}, minmax(276px, 1fr))`,
                    lg: `repeat(${visibleStages.length}, minmax(252px, 1fr))`,
                  },
                  gap: 1.5,
                  overflowX: 'auto',
                  overscrollBehaviorInline: 'contain',
                  scrollSnapType: { xs: 'x proximity', lg: 'none' },
                  pb: 2,
                  '& > *': { scrollSnapAlign: 'start' },
                }}
              >
                {visibleStages.map((item) => (
                  <DealLane
                    key={item}
                    stage={item}
                    deals={laneDeals(item)}
                    nextActionByDeal={nextActionByDeal}
                    draggable={canMove}
                    onOpen={(deal) => updateSearch({ deal: deal.id })}
                    onOpenActions={(anchor, deal) => setActionsMenu({ anchor, deal })}
                    onOpenNextAction={
                      canManage
                        ? (deal, nextAction) => setNextActionDrawer({ deal, task: nextAction })
                        : undefined
                    }
                  />
                ))}
              </Box>
              <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
                {activeDeal ? (
                  <DealDragPreview
                    deal={activeDeal}
                    nextAction={nextActionByDeal.get(activeDeal.id)}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </Box>

      <DealFiltersPopover
        anchor={filtersAnchor}
        stage={stage}
        onClose={() => setFiltersAnchor(null)}
        onStageChange={(nextStage) => updateSearch({ stage: nextStage })}
      />
      <DealActionsMenu
        state={actionsMenu}
        archivePending={archive.isPending}
        onClose={closeActions}
        onEdit={(deal) => {
          updateSearch({ deal: deal.id })
          closeActions()
        }}
        onToggleArchive={toggleArchive}
        onDelete={(deal) => {
          setDeleting(deal)
          closeActions()
        }}
      />

      {routeSearch.create && companies.data ? (
        <DealDrawer
          organizationId={org.id}
          companies={companies.data}
          onClose={() => updateSearch({ create: undefined })}
        />
      ) : null}
      {drawer && companies.data ? (
        <DealDrawer
          organizationId={org.id}
          companies={companies.data}
          deal={drawer.deal}
          initialStage={drawer.initialStage}
          onClose={() => setDrawer(null)}
        />
      ) : null}
      {routeSearch.deal && routeDeal.data && companies.data ? (
        <DealDrawer
          organizationId={org.id}
          companies={companies.data}
          deal={routeDeal.data}
          onClose={() => updateSearch({ deal: undefined })}
        />
      ) : null}
      {routeSearch.deal && (routeDeal.isPending || routeDeal.isError) ? (
        <Drawer
          anchor="right"
          open
          onClose={() => updateSearch({ deal: undefined })}
          sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 600 }, maxWidth: '100vw' } }}
        >
          {routeDeal.isPending ? (
            <Loading />
          ) : (
            <Failure error={routeDeal.error} retry={() => void routeDeal.refetch()} />
          )}
        </Drawer>
      ) : null}
      {nextActionDrawer && companies.data ? (
        <TaskDrawer
          organizationId={org.id}
          companies={companies.data}
          task={nextActionDrawer.task}
          initialCompanyId={nextActionDrawer.deal.company}
          initialDealId={nextActionDrawer.deal.id}
          onClose={() => setNextActionDrawer(null)}
        />
      ) : null}

      <DeleteDealDialog
        deal={deleting}
        pending={remove.isPending}
        error={remove.error}
        onClose={() => setDeleting(null)}
        onConfirm={(deal) => remove.mutate(deal.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}
