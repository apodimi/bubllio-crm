import type { ReactNode } from 'react'
import { Box, ButtonBase } from '@mui/material'

export interface OperationalTabOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface OperationalTabsProps<T extends string> {
  label: string
  options: readonly OperationalTabOption<T>[]
  value: T
  onChange: (value: T) => void
  divider?: boolean
}

export function OperationalTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  divider = true,
}: OperationalTabsProps<T>) {
  return (
    <Box
      component="nav"
      aria-label={label}
      sx={{
        display: 'flex',
        gap: { xs: 1, sm: 1.5 },
        overflowX: 'auto',
        borderBottom: divider ? 1 : 0,
        borderColor: 'divider',
        mb: divider ? 2 : 0,
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
              fontSize: '0.8125rem',
              lineHeight: 1.4,
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
