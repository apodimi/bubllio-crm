import { Button, Chip, MenuItem, Popover, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import {
  EntityListToolbar,
  EntityListViewTabs,
} from '../../../components/common/EntityListControls'
import type { DealStage } from '../../../types/deal.types'
import { DEAL_STAGES, DEAL_VIEWS, type DealView } from '../dealBoardConfig'

interface DealViewTabsProps {
  value: DealView
  onChange: (view: DealView) => void
}

export function DealViewTabs({ value, onChange }: DealViewTabsProps) {
  const { t } = useTranslation()
  const labels: Record<DealView, string> = {
    active: t('crm.deals.active'),
    all: t('crm.deals.all'),
    mine: t('crm.deals.mine'),
    no_next_action: t('crm.deals.noNextActionView'),
    closing_this_month: t('crm.deals.closingThisMonth'),
    archived: t('crm.deals.archived'),
  }
  return (
    <EntityListViewTabs
      label={t('crm.deals.quickViews')}
      options={DEAL_VIEWS.map((item) => ({ value: item, label: labels[item] }))}
      value={value}
      onChange={onChange}
    />
  )
}

interface DealBoardToolbarProps {
  search: string
  filterCount: number
  filtersOpen: boolean
  onSearchChange: (value: string) => void
  onOpenFilters: (anchor: HTMLElement) => void
}

export function DealBoardToolbar(props: DealBoardToolbarProps) {
  const { t } = useTranslation()
  return (
    <EntityListToolbar
      search={props.search}
      searchLabel={t('crm.deals.search')}
      searchPlaceholder={t('crm.deals.searchPlaceholder')}
      filterLabel={t('crm.deals.filtersButton')}
      filterCount={props.filterCount}
      filtersOpen={props.filtersOpen}
      onSearchChange={props.onSearchChange}
      onOpenFilters={props.onOpenFilters}
    />
  )
}

interface ActiveDealFiltersProps {
  stage: DealStage | ''
  onClearStage: () => void
  onClearAll: () => void
}

export function ActiveDealFilters({ stage, onClearStage, onClearAll }: ActiveDealFiltersProps) {
  const { t } = useTranslation()
  if (!stage) {
    return null
  }
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 2 }}
    >
      <Typography variant="caption" color="text.secondary">
        {t('crm.deals.activeFilters')}
      </Typography>
      <Chip
        size="small"
        label={`${t('crm.deals.stage')}: ${t(`crm.deals.stageLabels.${stage}`)}`}
        onDelete={onClearStage}
        sx={{ borderRadius: 1 }}
      />
      <Button color="inherit" size="small" onClick={onClearAll}>
        {t('crm.deals.clearAll')}
      </Button>
    </Stack>
  )
}

interface DealFiltersPopoverProps {
  anchor: HTMLElement | null
  stage: DealStage | ''
  onClose: () => void
  onStageChange: (stage?: DealStage) => void
}

export function DealFiltersPopover({
  anchor,
  stage,
  onClose,
  onStageChange,
}: DealFiltersPopoverProps) {
  const { t } = useTranslation()
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: { xs: 300, sm: 340 }, p: 2 } } }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">{t('crm.deals.filtersButton')}</Typography>
        <TextField
          select
          fullWidth
          label={t('crm.deals.stage')}
          value={stage}
          onChange={(event) => onStageChange((event.target.value || undefined) as DealStage)}
        >
          <MenuItem value="">{t('crm.deals.allStages')}</MenuItem>
          {DEAL_STAGES.map((item) => (
            <MenuItem key={item} value={item}>
              {t(`crm.deals.stageLabels.${item}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Popover>
  )
}
