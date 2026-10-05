import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material'
import type { Deal, DealStage } from '../../types/deal.types'

const money = (value: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value))

export function DealCard({
  deal,
  stages,
  onStageChange,
}: {
  deal: Deal
  stages: Array<{ value: DealStage; label: string }>
  onStageChange: (stage: DealStage) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { deal, stage: deal.stage },
  })
  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : 'auto',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <BoxContent deal={deal} />
        <Tooltip title="Drag to move deal">
          <IconButton
            size="small"
            aria-label={`Move ${deal.title}`}
            {...attributes}
            {...listeners}
            sx={{
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              mt: -0.5,
              mr: -0.5,
            }}
          >
            <DragIndicatorRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Typography variant="h6" sx={{ mt: 2 }}>
        {money(deal.gross_value, deal.currency)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {money(deal.net_value, deal.currency)} net · {deal.tax_rate}% VAT
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {deal.probability}% probability
        {deal.expected_close_date ? ` · ${deal.expected_close_date}` : ''}
      </Typography>
      <TextField
        select
        size="small"
        fullWidth
        label="Stage"
        value={deal.stage}
        sx={{ mt: 2 }}
        onChange={(event) => onStageChange(event.target.value as DealStage)}
      >
        {stages.map((stage) => (
          <MenuItem key={stage.value} value={stage.value}>
            {stage.label}
          </MenuItem>
        ))}
      </TextField>
    </Paper>
  )
}

function BoxContent({ deal }: { deal: Deal }) {
  return (
    <Stack sx={{ minWidth: 0, flex: 1 }}>
      <Typography sx={{ fontWeight: 750 }} noWrap>
        {deal.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {deal.company_name}
      </Typography>
    </Stack>
  )
}
