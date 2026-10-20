import { Box, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material'
import type { CompanyTimelineCategory } from '../../../types/company.types'

import type { TimelineTranslator } from './CompanyTimelineFormatters'

const timelineFilters: Array<'all' | CompanyTimelineCategory> = [
  'all',
  'company',
  'note',
  'task',
  'deal',
  'contact',
  'service',
  'payment',
  'communication',
]

interface CompanyTimelineFiltersProps {
  category: CompanyTimelineCategory | undefined
  onChange: (category: CompanyTimelineCategory | undefined) => void
  t: TimelineTranslator
}

export function CompanyTimelineFilters({ category, onChange, t }: CompanyTimelineFiltersProps) {
  function selectFilter(value: 'all' | CompanyTimelineCategory | null) {
    if (value) {
      onChange(value === 'all' ? undefined : value)
    }
  }

  return (
    <>
      <Box sx={{ display: { xs: 'none', xl: 'block' }, maxWidth: '100%' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={category ?? 'all'}
          aria-label={t('crm.companies.timeline.filterAria')}
          onChange={(_, value: 'all' | CompanyTimelineCategory | null) => selectFilter(value)}
        >
          {timelineFilters.map((filter) => (
            <ToggleButton key={filter} value={filter} sx={{ whiteSpace: 'nowrap' }}>
              {t(`crm.companies.timeline.filters.${filter}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <TextField
        select
        size="small"
        label={t('crm.companies.timeline.filterLabel')}
        value={category ?? 'all'}
        onChange={(event) => selectFilter(event.target.value as 'all' | CompanyTimelineCategory)}
        sx={{ display: { xs: 'flex', xl: 'none' }, minWidth: { sm: 200 } }}
      >
        {timelineFilters.map((filter) => (
          <MenuItem key={filter} value={filter}>
            {t(`crm.companies.timeline.filters.${filter}`)}
          </MenuItem>
        ))}
      </TextField>
    </>
  )
}
