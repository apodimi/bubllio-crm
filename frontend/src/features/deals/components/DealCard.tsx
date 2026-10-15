import calendarIcon from '@iconify-icons/keyline-icons/calendar'
import gripVertical from '@iconify-icons/keyline-icons/grip-vertical'
import moreHorizontal from '@iconify-icons/keyline-icons/more-horizontal'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Box, ButtonBase, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import type { Deal } from '../../../types/deal.types'
import type { CrmTask } from '../../../types/task.types'

interface DealCardProps {
  deal: Deal
  nextAction?: CrmTask
  draggable: boolean
  onOpen: () => void
  onOpenActions: (anchor: HTMLElement) => void
  onOpenNextAction?: () => void
}

export function DealCard({
  deal,
  nextAction,
  draggable,
  onOpen,
  onOpenActions,
  onOpenNextAction,
}: DealCardProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { deal, stage: deal.stage },
    disabled: !draggable,
  })
  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.24 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : 'auto',
      }}
    >
      <DealCardSurface
        deal={deal}
        nextAction={nextAction}
        onOpen={onOpen}
        onOpenNextAction={onOpenNextAction}
        controls={
          <Stack direction="row" spacing={0.25}>
            {draggable ? (
              <Tooltip title={t('crm.deals.dragToMove')} placement="top">
                <IconButton
                  size="small"
                  aria-label={t('crm.deals.moveDeal', { title: deal.title })}
                  {...attributes}
                  {...listeners}
                  sx={{ color: 'text.secondary', cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  <AppIcon icon={gripVertical} size={18} />
                </IconButton>
              </Tooltip>
            ) : null}
            <IconButton
              size="small"
              aria-label={t('crm.deals.moreActions', { title: deal.title })}
              onClick={(event) => onOpenActions(event.currentTarget)}
            >
              <AppIcon icon={moreHorizontal} size={18} />
            </IconButton>
          </Stack>
        }
      />
    </Box>
  )
}

export function DealDragPreview({ deal, nextAction }: { deal: Deal; nextAction?: CrmTask }) {
  return (
    <Box sx={{ width: 280, transform: 'rotate(1deg)', cursor: 'grabbing' }}>
      <DealCardSurface deal={deal} nextAction={nextAction} preview />
    </Box>
  )
}

function DealCardSurface({
  deal,
  nextAction,
  onOpen,
  onOpenNextAction,
  controls,
  preview = false,
}: {
  deal: Deal
  nextAction?: CrmTask
  onOpen?: () => void
  onOpenNextAction?: () => void
  controls?: React.ReactNode
  preview?: boolean
}) {
  const { t, i18n } = useTranslation()
  const money = new Intl.NumberFormat(i18n.resolvedLanguage, {
    style: 'currency',
    currency: deal.currency,
    maximumFractionDigits: 0,
  })
  const date = deal.expected_close_date
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'short' }).format(
        new Date(deal.expected_close_date),
      )
    : null
  const nextActionDate = nextAction
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'short' }).format(
        new Date(nextAction.due_at),
      )
    : null
  const showsNextAction = !deal.archived_at && !['won', 'lost'].includes(deal.stage)
  const actionLabel = nextAction
    ? t('crm.deals.nextAction', { title: nextAction.title, date: nextActionDate })
    : t('crm.deals.addNextAction')

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1.5,
        borderColor: preview ? 'primary.main' : 'divider',
        boxShadow: preview ? 3 : 'none',
        bgcolor: 'background.paper',
        transition: 'border-color 140ms ease-out, box-shadow 140ms ease-out',
        '&:hover': preview ? undefined : { borderColor: 'text.disabled' },
        '&:hover .DealCard-controls, &:focus-within .DealCard-controls': { opacity: 1 },
      }}
    >
      <ButtonBase
        disabled={!onOpen}
        onClick={onOpen}
        aria-label={t('crm.deals.openDeal', { title: deal.title })}
        sx={{
          width: '100%',
          minHeight: 140,
          px: 1.5,
          py: 1.5,
          pr: controls ? 6.5 : 1.5,
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          textAlign: 'left',
        }}
      >
        <Stack spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 750,
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {deal.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
              {deal.company_name}
            </Typography>
            {deal.archived_at ? (
              <Typography variant="caption" color="text.secondary">
                {t('crm.deals.archivedSingle')}
              </Typography>
            ) : null}
          </Box>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
          >
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 750,
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {money.format(Number(deal.net_value))}
            </Typography>
            <Tooltip title={t('crm.deals.probability', { value: deal.probability })}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  pl: 1.5,
                  ml: 1.5,
                  borderLeft: 1,
                  borderColor: 'divider',
                  fontWeight: 650,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {deal.probability}%
              </Typography>
            </Tooltip>
          </Stack>
          {date ? (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', color: 'text.secondary' }}
            >
              <AppIcon icon={calendarIcon} size={15} />
              <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {t('crm.deals.closeBy', { date })}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </ButtonBase>
      {showsNextAction ? (
        <ButtonBase
          disabled={!onOpenNextAction}
          onClick={onOpenNextAction}
          aria-label={
            nextAction
              ? t('crm.deals.openNextAction', { title: nextAction.title })
              : t('crm.deals.addNextActionFor', { title: deal.title })
          }
          sx={{
            width: '100%',
            minHeight: 48,
            px: 1.5,
            py: 1,
            gap: 1,
            justifyContent: 'flex-start',
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: nextAction ? 'action.selected' : 'background.paper',
            color: nextAction?.effective_status === 'overdue' ? 'error.main' : 'primary.main',
            textAlign: 'left',
            '&:hover': { bgcolor: nextAction ? 'action.selected' : 'action.hover' },
            '&.Mui-disabled': {
              color: nextAction?.effective_status === 'overdue' ? 'error.main' : 'primary.main',
              opacity: 1,
            },
          }}
        >
          <Box
            sx={{
              width: 20,
              height: 20,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              color: nextAction ? 'inherit' : 'warning.main',
            }}
          >
            <AppIcon icon={nextAction ? calendarIcon : plusIcon} size={17} />
          </Box>
          <Typography variant="caption" noWrap sx={{ minWidth: 0, fontWeight: 700 }}>
            {actionLabel}
          </Typography>
        </ButtonBase>
      ) : null}
      {controls ? (
        <Box
          className="DealCard-controls"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            opacity: 1,
            transition: 'opacity 140ms ease-out',
            '@media (hover: hover)': { opacity: 0 },
          }}
        >
          {controls}
        </Box>
      ) : null}
    </Paper>
  )
}
