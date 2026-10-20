import filterIcon from '@iconify-icons/keyline-icons/filter'
import searchIcon from '@iconify-icons/keyline-icons/search'
import { Button, IconButton, InputAdornment, Stack, TextField } from '@mui/material'

import { AppIcon } from './AppIcon'
export { OperationalTabs as EntityListViewTabs } from './OperationalTabs'
export type { OperationalTabOption as EntityListViewOption } from './OperationalTabs'

interface EntityListToolbarProps {
  search: string
  searchLabel: string
  searchPlaceholder: string
  filterLabel: string
  filterCount: number
  filtersOpen: boolean
  onSearchChange: (value: string) => void
  onOpenFilters: (anchor: HTMLElement) => void
}

export function EntityListToolbar({
  search,
  searchLabel,
  searchPlaceholder,
  filterLabel,
  filterCount,
  filtersOpen,
  onSearchChange,
  onOpenFilters,
}: EntityListToolbarProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
      <TextField
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        sx={{ width: { xs: '100%', sm: 420 }, minWidth: 0 }}
        slotProps={{
          htmlInput: { 'aria-label': searchLabel },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <AppIcon icon={searchIcon} size={18} />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button
        variant="outlined"
        startIcon={<AppIcon icon={filterIcon} size={18} />}
        aria-label={filterLabel}
        onClick={(event) => onOpenFilters(event.currentTarget)}
        aria-expanded={filtersOpen}
        sx={{ display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0 }}
      >
        {filterLabel}
        {filterCount ? ` · ${filterCount}` : ''}
      </Button>
      <IconButton
        aria-label={filterLabel}
        onClick={(event) => onOpenFilters(event.currentTarget)}
        aria-expanded={filtersOpen}
        sx={{ display: { xs: 'inline-flex', sm: 'none' }, flexShrink: 0 }}
      >
        <AppIcon icon={filterIcon} size={20} />
      </IconButton>
    </Stack>
  )
}
