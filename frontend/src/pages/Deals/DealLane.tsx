import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Chip, Paper, Stack, Typography } from '@mui/material'
import type { Deal, DealStage } from '../../types/deal.types'
import { DealCard } from './DealCard'

export function DealLane({
  stage,
  label,
  deals,
  stages,
  onStageChange,
}: {
  stage: DealStage
  label: string
  deals: Deal[]
  stages: Array<{ value: DealStage; label: string }>
  onStageChange: (deal: Deal, stage: DealStage) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage}`, data: { stage } })
  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        p: 2,
        minHeight: 300,
        bgcolor: isOver ? 'action.hover' : 'background.default',
        transition: 'background-color 120ms ease-out',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
        <Chip size="small" label={deals.length} />
      </Stack>
      <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1.5}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              stages={stages}
              onStageChange={(next) => onStageChange(deal, next)}
            />
          ))}
        </Stack>
      </SortableContext>
    </Paper>
  )
}
