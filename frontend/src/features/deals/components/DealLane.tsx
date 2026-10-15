import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { Deal, DealStage } from '../../../types/deal.types'
import type { CrmTask } from '../../../types/task.types'
import { DealCard } from './DealCard'

interface DealLaneProps {
  stage: DealStage
  deals: Deal[]
  nextActionByDeal: Map<string, CrmTask>
  draggable: boolean
  onOpen: (deal: Deal) => void
  onOpenActions: (anchor: HTMLElement, deal: Deal) => void
  onOpenNextAction?: (deal: Deal, nextAction?: CrmTask) => void
}

export function DealLane({
  stage,
  deals,
  nextActionByDeal,
  draggable,
  onOpen,
  onOpenActions,
  onOpenNextAction,
}: DealLaneProps) {
  const { t, i18n } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage}`,
    data: { stage },
    disabled: !draggable,
  })
  const totals = new Map<string, number>()
  for (const deal of deals) {
    totals.set(deal.currency, (totals.get(deal.currency) ?? 0) + Number(deal.net_value))
  }
  let stageColor = 'primary.main'
  if (stage === 'won') {
    stageColor = 'success.main'
  } else if (stage === 'lost') {
    stageColor = 'error.main'
  }

  return (
    <Box
      ref={setNodeRef}
      data-has-deals={deals.length > 0 ? 'true' : 'false'}
      sx={{
        minHeight: 440,
        p: 1.25,
        border: 1,
        borderColor: isOver ? 'primary.main' : 'divider',
        borderRadius: 2,
        bgcolor: isOver ? 'action.hover' : 'background.default',
        transition: 'background-color 140ms ease-out, border-color 140ms ease-out',
      }}
    >
      <Stack spacing={0.75} sx={{ px: 0.5, pt: 0.25, pb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: stageColor }} />
          <Typography sx={{ fontWeight: 750, flex: 1 }}>
            {t(`crm.deals.stageLabels.${stage}`)}
          </Typography>
          <Box
            aria-label={t('crm.deals.dealCount', { count: deals.length })}
            sx={{
              minWidth: 24,
              height: 24,
              px: 0.75,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {deals.length}
          </Box>
        </Stack>
        {Array.from(totals).map(([currency, total]) => (
          <Typography
            key={currency}
            variant="caption"
            color="text.secondary"
            sx={{ pl: 1.875, fontVariantNumeric: 'tabular-nums' }}
          >
            {t('crm.deals.netTotal', {
              value: new Intl.NumberFormat(i18n.resolvedLanguage, {
                style: 'currency',
                currency,
                maximumFractionDigits: 0,
              }).format(total),
            })}
          </Typography>
        ))}
      </Stack>
      <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              nextAction={nextActionByDeal.get(deal.id)}
              draggable={draggable && !deal.archived_at}
              onOpen={() => onOpen(deal)}
              onOpenActions={(anchor) => onOpenActions(anchor, deal)}
              onOpenNextAction={
                onOpenNextAction
                  ? () => onOpenNextAction(deal, nextActionByDeal.get(deal.id))
                  : undefined
              }
            />
          ))}
          {deals.length === 0 ? (
            <Box
              sx={{
                minHeight: 108,
                border: '1px dashed',
                borderColor: isOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                color: isOver ? 'primary.main' : 'text.secondary',
                bgcolor: isOver ? 'background.paper' : 'transparent',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 650 }}>
                {isOver
                  ? t('crm.deals.moveTo', { stage: t(`crm.deals.stageLabels.${stage}`) })
                  : t('crm.deals.emptyLane')}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </SortableContext>
    </Box>
  )
}
