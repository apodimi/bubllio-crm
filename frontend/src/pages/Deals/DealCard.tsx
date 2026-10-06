import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import EventOutlined from '@mui/icons-material/EventOutlined'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { alpha } from '@mui/material/styles'
import {
  Avatar,
  Box,
  ButtonBase,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type { Deal } from '../../types/deal.types'
import type { CrmTask } from '../../types/task.types'

const money = (value: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value))

export function DealCard({
  deal,
  nextAction,
  onEdit,
}: {
  deal: Deal
  nextAction?: CrmTask
  onEdit: () => void
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
        nextAction={nextAction}
        onEdit={onEdit}
        dragHandle={
          <Tooltip title="Drag to move" placement="top">
            <IconButton
              size="small"
              aria-label={`Move ${deal.title}`}
              onClick={(event) => event.stopPropagation()}
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
  nextAction,
  onEdit,
  dragHandle,
  preview = false,
}: {
  deal: Deal
  nextAction?: CrmTask
  onEdit?: () => void
  dragHandle?: React.ReactNode
  preview?: boolean
}) {
  const initials = deal.company_name.trim().slice(0, 2).toUpperCase()
  return (
    <Paper
      elevation={preview ? 4 : 1}
      onClick={onEdit}
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: preview ? 'primary.main' : 'divider',
        boxShadow: preview ? undefined : '0 3px 12px rgba(15,31,56,.055)',
        transition:
          'border-color 140ms ease-out, box-shadow 140ms ease-out, transform 140ms ease-out',
        cursor: onEdit ? 'pointer' : 'grabbing',
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
      {!preview && !['won', 'lost'].includes(deal.stage) ? (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: 'flex-start',
            mt: 1.5,
            color: nextAction?.effective_status === 'overdue' ? 'error.main' : 'text.secondary',
          }}
        >
          <EventOutlined sx={{ fontSize: 16, mt: '1px' }} />
          <Typography variant="caption" sx={{ fontWeight: nextAction ? 650 : 500 }}>
            {nextAction
              ? `Next: ${nextAction.title} · ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(nextAction.due_at))}`
              : 'No next action'}
          </Typography>
        </Stack>
      ) : null}
      {!preview && onEdit ? (
        <ButtonBase
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          sx={{
            mt: 1.75,
            borderRadius: 1,
            color: 'primary.main',
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'action.focus',
              outlineOffset: 2,
            },
          }}
        >
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <EditOutlined sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Open and edit
            </Typography>
          </Stack>
        </ButtonBase>
      ) : null}
    </Paper>
  )
}
