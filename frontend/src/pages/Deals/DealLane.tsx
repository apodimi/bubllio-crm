import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { alpha } from '@mui/material/styles'
import { Box, Stack, Typography } from '@mui/material'
import type { Deal, DealStage } from '../../types/deal.types'
import type { CrmTask } from '../../types/task.types'
import { DealCard } from './DealCard'

const money = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

export function DealLane({
  stage,
  label,
  accent,
  deals,
  nextActionByDeal,
  onEdit,
}: {
  stage: DealStage
  label: string
  accent: string
  deals: Deal[]
  nextActionByDeal: Map<string, CrmTask>
  onEdit: (deal: Deal) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage}`, data: { stage } })
  const totals = deals.reduce<Record<string, number>>(
    (result, deal) => ({
      ...result,
      [deal.currency]: (result[deal.currency] ?? 0) + Number(deal.net_value),
    }),
    {},
  )
  return (
    <Box
      ref={setNodeRef}
      sx={{
        p: 1.5,
        minHeight: 440,
        borderRadius: '16px',
        bgcolor: isOver
          ? (theme) => alpha(theme.palette.primary.main, 0.075)
          : (theme) => alpha(theme.palette.primary.main, 0.025),
        outline: '1px solid',
        outlineColor: isOver ? (theme) => alpha(theme.palette.primary.main, 0.45) : 'divider',
        outlineOffset: -1,
        transition: 'background-color 140ms ease-out, outline-color 140ms ease-out',
      }}
    >
      <Stack spacing={0.75} sx={{ px: 0.5, pt: 0.25, pb: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: accent,
              boxShadow: `0 0 0 4px ${alpha(accent, 0.12)}`,
            }}
          />
          <Typography sx={{ fontWeight: 800, flex: 1 }}>{label}</Typography>
          <Box
            sx={{
              minWidth: 24,
              height: 24,
              px: 0.75,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 750,
            }}
          >
            {deals.length}
          </Box>
        </Stack>
        {Object.entries(totals).map(([currency, total]) => (
          <Typography
            key={currency}
            variant="caption"
            color="text.secondary"
            sx={{ pl: 2, fontVariantNumeric: 'tabular-nums' }}
          >
            {money(total, currency)} net
          </Typography>
        ))}
      </Stack>
      <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1.25}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              nextAction={nextActionByDeal.get(deal.id)}
              onEdit={() => onEdit(deal)}
            />
          ))}
          {deals.length === 0 ? (
            <Box
              sx={{
                minHeight: 116,
                border: '1px dashed',
                borderColor: isOver ? 'primary.main' : 'divider',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                color: isOver ? 'primary.main' : 'text.secondary',
                bgcolor: isOver
                  ? (theme) => alpha(theme.palette.primary.main, 0.04)
                  : 'transparent',
                transition: 'all 140ms ease-out',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 650 }}>
                {isOver ? `Move to ${label}` : 'Drop a deal here'}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </SortableContext>
    </Box>
  )
}
