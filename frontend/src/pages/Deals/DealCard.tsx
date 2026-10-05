import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded'
import EventOutlined from '@mui/icons-material/EventOutlined'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { alpha } from '@mui/material/styles'
import {
  Avatar,
  Box,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
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
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.22 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : 'auto',
      }}
    >
      <DealCardSurface
        deal={deal}
        stages={stages}
        onStageChange={onStageChange}
        dragHandle={
          <Tooltip title="Drag to move" placement="top">
            <IconButton
              size="small"
              aria-label={`Move ${deal.title}`}
              {...attributes}
              {...listeners}
              sx={{
                width: 30,
                height: 30,
                flex: '0 0 auto',
                color: 'text.secondary',
                bgcolor: 'action.hover',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                '&:hover': { color: 'primary.main', bgcolor: 'action.focus' },
              }}
            >
              <DragIndicatorRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      />
    </Box>
  )
}

export function DealDragPreview({ deal }: { deal: Deal }) {
  return (
    <Box sx={{ width: 260, transform: 'rotate(1.5deg)', cursor: 'grabbing' }}>
      <DealCardSurface deal={deal} preview />
    </Box>
  )
}

function DealCardSurface({
  deal,
  stages,
  onStageChange,
  dragHandle,
  preview = false,
}: {
  deal: Deal
  stages?: Array<{ value: DealStage; label: string }>
  onStageChange?: (stage: DealStage) => void
  dragHandle?: React.ReactNode
  preview?: boolean
}) {
  const initials = deal.company_name.trim().slice(0, 2).toUpperCase()
  return (
    <Paper
      elevation={preview ? 4 : 1}
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: preview ? 'primary.main' : 'divider',
        boxShadow: preview ? undefined : '0 3px 12px rgba(15,31,56,.055)',
        transition:
          'border-color 140ms ease-out, box-shadow 140ms ease-out, transform 140ms ease-out',
        '&:hover': preview
          ? undefined
          : {
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
              boxShadow: '0 10px 26px rgba(15,31,56,.1)',
              transform: 'translateY(-1px)',
            },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.light',
            color: 'primary.dark',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {initials}
        </Avatar>
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={deal.title} enterDelay={600}>
            <Typography
              sx={{
                fontWeight: 750,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {deal.title}
            </Typography>
          </Tooltip>
          <Typography variant="body2" color="text.secondary" noWrap>
            {deal.company_name}
          </Typography>
        </Stack>
        {dragHandle}
      </Stack>
      <Box sx={{ mt: 2.25 }}>
        <Typography
          sx={{
            fontFamily: 'Manrope',
            fontSize: 20,
            lineHeight: 1.2,
            fontWeight: 750,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {money(deal.net_value, deal.currency)}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {money(deal.tax_value, deal.currency)} VAT · {money(deal.gross_value, deal.currency)}{' '}
          total
        </Typography>
      </Box>
      <Stack spacing={0.75} sx={{ mt: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Win probability
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {deal.probability}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={deal.probability}
          aria-label={`${deal.probability}% win probability`}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { borderRadius: 2 },
          }}
        />
      </Stack>
      {deal.expected_close_date ? (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', mt: 1.5, color: 'text.secondary' }}
        >
          <EventOutlined sx={{ fontSize: 16 }} />
          <Typography variant="caption">Close by {deal.expected_close_date}</Typography>
        </Stack>
      ) : null}
      {!preview && stages && onStageChange ? (
        <TextField
          select
          size="small"
          fullWidth
          label="Stage"
          value={deal.stage}
          sx={{ mt: 2, '& .MuiInputBase-root': { bgcolor: 'background.default' } }}
          onChange={(event) => onStageChange(event.target.value as DealStage)}
        >
          {stages.map((stage) => (
            <MenuItem key={stage.value} value={stage.value}>
              {stage.label}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
    </Paper>
  )
}
