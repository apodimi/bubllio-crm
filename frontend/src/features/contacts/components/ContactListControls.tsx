import { Button, Chip, MenuItem, Popover, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import {
  EntityListToolbar,
  EntityListViewTabs,
} from '../../../components/common/EntityListControls'
import type { Company } from '../../../types/company.types'
import { CONTACT_VIEWS, type ContactView } from '../contactListConfig'

interface ContactViewTabsProps {
  value: ContactView
  onChange: (view: ContactView) => void
}

export function ContactViewTabs({ value, onChange }: ContactViewTabsProps) {
  const { t } = useTranslation()
  const labels: Record<ContactView, string> = {
    active: t('crm.contacts.active'),
    all: t('crm.contacts.allRecords'),
    archived: t('crm.contacts.archived'),
  }

  return (
    <EntityListViewTabs
      label={t('crm.contacts.quickViews')}
      options={CONTACT_VIEWS.map((item) => ({ value: item, label: labels[item] }))}
      value={value}
      onChange={onChange}
    />
  )
}

interface ContactListToolbarProps {
  search: string
  filterCount: number
  filtersOpen: boolean
  onSearchChange: (value: string) => void
  onOpenFilters: (anchor: HTMLElement) => void
}

export function ContactListToolbar(props: ContactListToolbarProps) {
  const { t } = useTranslation()
  return (
    <EntityListToolbar
      search={props.search}
      searchLabel={t('crm.contacts.search')}
      searchPlaceholder={t('crm.contacts.searchPlaceholder')}
      filterLabel={t('crm.contacts.filtersButton')}
      filterCount={props.filterCount}
      filtersOpen={props.filtersOpen}
      onSearchChange={props.onSearchChange}
      onOpenFilters={props.onOpenFilters}
    />
  )
}

interface ActiveContactFiltersProps {
  company: string
  companyName: string
  onClearCompany: () => void
  onClearAll: () => void
}

export function ActiveContactFilters({
  company,
  companyName,
  onClearCompany,
  onClearAll,
}: ActiveContactFiltersProps) {
  const { t } = useTranslation()
  if (!company) return null

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
        {t('crm.contacts.activeFilters')}
      </Typography>
      <Chip
        size="small"
        label={`${t('crm.contacts.company')}: ${companyName}`}
        onDelete={onClearCompany}
        sx={{ borderRadius: 1 }}
      />
      <Button color="inherit" size="small" onClick={onClearAll}>
        {t('crm.contacts.clearAll')}
      </Button>
    </Stack>
  )
}

interface ContactFiltersPopoverProps {
  anchor: HTMLElement | null
  company: string
  companies: Company[]
  onClose: () => void
  onCompanyChange: (company?: string) => void
}

export function ContactFiltersPopover({
  anchor,
  company,
  companies,
  onClose,
  onCompanyChange,
}: ContactFiltersPopoverProps) {
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
        <Typography variant="subtitle2">{t('crm.contacts.filtersButton')}</Typography>
        <TextField
          select
          fullWidth
          label={t('crm.contacts.company')}
          value={company}
          onChange={(event) => onCompanyChange(event.target.value || undefined)}
        >
          <MenuItem value="">{t('crm.contacts.allCompanies')}</MenuItem>
          {companies.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Popover>
  )
}
