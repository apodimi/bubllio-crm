import type { ReactNode } from 'react'
import filterIcon from '@iconify-icons/keyline-icons/filter'
import searchIcon from '@iconify-icons/keyline-icons/search'
import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material'

import { AppIcon } from './AppIcon'

export interface EntityListViewOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface EntityListViewTabsProps<T extends string> {
  label: string
  options: readonly EntityListViewOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function EntityListViewTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: EntityListViewTabsProps<T>) {
  return (
    <Box
      component="nav"
      aria-label={label}
      sx={{
        display: 'flex',
        overflowX: 'auto',
        borderBottom: 1,
        borderColor: 'divider',
        mb: 2,
      }}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <ButtonBase
            key={option.value}
            disabled={option.disabled}
            aria-current={selected ? 'page' : undefined}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            sx={{
              position: 'relative',
              flexShrink: 0,
              minHeight: 44,
              px: { xs: 1.25, sm: 1.75 },
              color: selected ? 'text.primary' : 'text.secondary',
              fontWeight: selected ? 700 : 600,
              '&::after': selected
                ? {
                    content: '""',
                    position: 'absolute',
                    height: 2,
                    insetInline: { xs: 10, sm: 14 },
                    bottom: 0,
                    bgcolor: 'primary.main',
                  }
                : undefined,
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            }}
          >
            {option.label}
          </ButtonBase>
        )
      })}
    </Box>
  )
}

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
