import { Button, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import {
  EntityListToolbar,
  EntityListViewTabs,
} from '../../../components/common/EntityListControls'
import type { Company } from '../../../types/company.types'
import {
  COMPANY_SORT_TRANSLATION_KEYS,
  COMPANY_VIEWS,
  type CompanySort,
  type CompanyView,
} from '../companyListConfig'

interface CompanyViewTabsProps {
  currentUserId?: number
  value: CompanyView
  onChange: (view: CompanyView) => void
}

export function CompanyViewTabs({ currentUserId, value, onChange }: CompanyViewTabsProps) {
  const { t } = useTranslation()
  const labels: Record<CompanyView, string> = {
    active: t('crm.companies.active'),
    mine: t('crm.companies.mine'),
    unassigned: t('crm.companies.unassigned'),
    archived: t('crm.companies.archived'),
  }

  return (
    <EntityListViewTabs
      label={t('crm.companies.quickViews')}
      options={COMPANY_VIEWS.map((item) => ({
        value: item,
        label: labels[item],
        disabled: item === 'mine' && !currentUserId,
      }))}
      value={value}
      onChange={onChange}
    />
  )
}

interface CompanyListToolbarProps {
  search: string
  advancedFilterCount: number
  filtersOpen: boolean
  onSearchChange: (value: string) => void
  onOpenFilters: (anchor: HTMLElement) => void
}

export function CompanyListToolbar({
  search,
  advancedFilterCount,
  filtersOpen,
  onSearchChange,
  onOpenFilters,
}: CompanyListToolbarProps) {
  const { t } = useTranslation()

  return (
    <EntityListToolbar
      search={search}
      searchLabel={t('crm.companies.search')}
      searchPlaceholder={t('crm.companies.searchPlaceholder')}
      filterLabel={t('crm.companies.filtersButton')}
      filterCount={advancedFilterCount}
      filtersOpen={filtersOpen}
      onSearchChange={onSearchChange}
      onOpenFilters={onOpenFilters}
    />
  )
}

interface ActiveCompanyFiltersProps {
  stage: Company['lifecycle_stage'] | ''
  owner: string
  ordering: CompanySort
  hasExplicitSort: boolean
  ownerLabel: (owner: string) => string
  onClearStage: () => void
  onClearOwner: () => void
  onClearSort: () => void
  onClearAll: () => void
}

export function ActiveCompanyFilters({
  stage,
  owner,
  ordering,
  hasExplicitSort,
  ownerLabel,
  onClearStage,
  onClearOwner,
  onClearSort,
  onClearAll,
}: ActiveCompanyFiltersProps) {
  const { t } = useTranslation()
  if (!stage && !owner && !hasExplicitSort) {
    return null
  }
  let stageName = ''
  if (stage === 'customer') {
    stageName = t('crm.companies.customerStage')
  } else if (stage) {
    stageName = t(`crm.companies.${stage}`)
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {t('crm.companies.activeFilters')}
      </Typography>
      {stage ? (
        <Chip size="small" label={stageName} onDelete={onClearStage} sx={{ borderRadius: 1 }} />
      ) : null}
      {owner ? (
        <Chip
          size="small"
          label={ownerLabel(owner)}
          onDelete={onClearOwner}
          sx={{ borderRadius: 1 }}
        />
      ) : null}
      {hasExplicitSort ? (
        <Chip
          size="small"
          label={t(COMPANY_SORT_TRANSLATION_KEYS[ordering])}
          onDelete={onClearSort}
          sx={{ borderRadius: 1 }}
        />
      ) : null}
      <Button color="inherit" size="small" onClick={onClearAll}>
        {t('crm.companies.clearAll')}
      </Button>
    </Stack>
  )
}
