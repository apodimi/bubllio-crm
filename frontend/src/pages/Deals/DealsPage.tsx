import { useState } from 'react'
import AddRounded from '@mui/icons-material/AddRounded'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Alert, Box, Button, Chip, Stack } from '@mui/material'
import { CreateDialog } from '../../components/common/CreateDialog'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { useCompanies } from '../../features/companies'
import { dealKeys, useDeals, useMoveDeal, useUpdateDeal } from '../../features/deals'
import { canCreateRecords, organizationPath, useWorkspace } from '../../features/organizations'
import type { Deal, DealStage } from '../../types/deal.types'
import { DealDragPreview } from './DealCard'
import { DealLane } from './DealLane'

const stages: Array<{ value: DealStage; label: string; accent: string }> = [
  { value: 'lead', label: 'Lead', accent: '#6b7a90' },
  { value: 'qualified', label: 'Qualified', accent: '#005bef' },
  { value: 'proposal', label: 'Proposal', accent: '#4f46e5' },
  { value: 'negotiation', label: 'Negotiation', accent: '#d97706' },
  { value: 'won', label: 'Won', accent: '#16845b' },
  { value: 'lost', label: 'Lost', accent: '#c24157' },
]
const money = (value: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value))

export function DealsPage() {
  const org = useWorkspace()
  const deals = useDeals(org.id)
  const companies = useCompanies(org.id, { archived: 'active' })
  const update = useUpdateDeal(org.id)
  const move = useMoveDeal(org.id)
  const [create, setCreate] = useState(false)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const rows = deals.data ?? []
  const open = rows.filter((deal) => !['won', 'lost'].includes(deal.stage))
  const forecasts = Object.values(
    open.reduce<Record<string, { currency: string; total: number; weighted: number }>>(
      (totals, deal) => {
        const current = totals[deal.currency] ?? { currency: deal.currency, total: 0, weighted: 0 }
        current.total += Number(deal.net_value)
        current.weighted += (Number(deal.net_value) * deal.probability) / 100
        totals[deal.currency] = current
        return totals
      },
      {},
    ),
  )
  const laneDeals = (stage: DealStage) =>
    rows.filter((deal) => deal.stage === stage).sort((a, b) => a.sort_order - b.sort_order)

  function changeStage(deal: Deal, stage: DealStage) {
    update.mutate({
      id: deal.id,
      body: {
        stage,
        lost_reason: stage === 'lost' ? deal.lost_reason || 'Not specified' : deal.lost_reason,
      },
    })
  }

  function dragEnd(event: DragEndEvent) {
    setActiveDeal(null)
    const deal = event.active.data.current?.deal as Deal | undefined
    const stage = event.over?.data.current?.stage as DealStage | undefined
    if (!deal || !stage || !event.over) return
    const targetLane = laneDeals(stage)
    const destination = targetLane.filter((item) => item.id !== deal.id)
    const overDeal = event.over.data.current?.deal as Deal | undefined
    if (overDeal?.id === deal.id) return
    const targetIndex = overDeal
      ? targetLane.findIndex((item) => item.id === overDeal.id)
      : destination.length
    if (stage === 'lost') return changeStage(deal, stage)
    move.mutate({
      id: deal.id,
      stage,
      position: targetIndex < 0 ? destination.length : targetIndex,
    })
  }

  function dragStart(event: DragStartEvent) {
    setActiveDeal((event.active.data.current?.deal as Deal | undefined) ?? null)
  }

  const mutationError = update.error ?? move.error
  return (
    <>
      <PageHeading
        title="Sales pipeline"
        description="Turn active conversations into predictable revenue. Drag a deal by its handle to move it."
        action={
          canCreateRecords(org) ? (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              disabled={!companies.data?.length}
              onClick={() => setCreate(true)}
            >
              Add deal
            </Button>
          ) : null
        }
      />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Chip label={`${open.length} open deals`} variant="outlined" />
        {forecasts.map((forecast) => (
          <Box key={forecast.currency} sx={{ display: 'contents' }}>
            <Chip
              label={`${money(String(forecast.total), forecast.currency)} net pipeline`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`${money(String(forecast.weighted), forecast.currency)} weighted forecast`}
              variant="outlined"
            />
          </Box>
        ))}
      </Stack>
      {mutationError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutationError.message}
        </Alert>
      ) : null}
      {deals.isPending || companies.isPending ? (
        <Loading />
      ) : deals.isError ? (
        <Failure error={deals.error} retry={() => void deals.refetch()} />
      ) : rows.length === 0 ? (
        <Empty
          title="Build your first pipeline"
          description="Add an opportunity and move it forward as the conversation develops."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={dragStart}
          onDragCancel={() => setActiveDeal(null)}
          onDragEnd={dragEnd}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(6,minmax(280px,1fr))',
                lg: 'repeat(6,minmax(252px,1fr))',
              },
              gap: 2,
              overflowX: 'auto',
              pb: 2,
            }}
          >
            {stages.map((stage) => (
              <DealLane
                key={stage.value}
                stage={stage.value}
                label={stage.label}
                accent={stage.accent}
                deals={laneDeals(stage.value)}
                stages={stages}
                onStageChange={changeStage}
              />
            ))}
          </Box>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
            {activeDeal ? <DealDragPreview deal={activeDeal} /> : null}
          </DragOverlay>
        </DndContext>
      )}
      {create && companies.data ? (
        <CreateDialog
          title="Add deal"
          path={`${organizationPath(org.id)}deals/`}
          invalidate={dealKeys.list(org.id)}
          onClose={() => setCreate(false)}
          fields={[
            { name: 'title', label: 'Deal title', required: true, maxLength: 255 },
            {
              name: 'company',
              label: 'Company',
              required: true,
              options: companies.data.map((company) => ({
                value: company.id,
                label: company.name,
              })),
            },
            { name: 'value', label: 'Amount', required: true, type: 'number' },
            {
              name: 'currency',
              label: 'Currency',
              required: true,
              options: [
                { value: 'EUR', label: 'EUR' },
                { value: 'USD', label: 'USD' },
                { value: 'GBP', label: 'GBP' },
              ],
            },
            { name: 'tax_rate', label: 'VAT rate %', type: 'number' },
            {
              name: 'amount_includes_tax',
              label: 'Amount includes VAT',
              options: [
                { value: 'false', label: 'No — amount is net' },
                { value: 'true', label: 'Yes — amount is gross' },
              ],
            },
            { name: 'probability', label: 'Probability %', type: 'number' },
            { name: 'expected_close_date', label: 'Expected close date', type: 'date' },
          ]}
        />
      ) : null}
    </>
  )
}
