import chevronLeftIcon from '@iconify-icons/keyline-icons/chevron-left'
import chevronRightIcon from '@iconify-icons/keyline-icons/chevron-right'
import { Link } from '@tanstack/react-router'
import { Box, IconButton, Stack, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../common/AppIcon'
import { BrandLogo } from '../common/BrandLogo'

type WorkspaceSidebarHeaderProps = { expanded: boolean; onToggle?: () => void }

export function WorkspaceSidebarHeader({ expanded, onToggle }: WorkspaceSidebarHeaderProps) {
  const { t } = useTranslation()
  const toggleLabel = expanded
    ? t('navigation.collapseNavigation')
    : t('navigation.expandNavigation')

  return (
    <Stack
      direction={expanded ? 'row' : 'column'}
      sx={{
        alignItems: 'center',
        justifyContent: expanded ? 'space-between' : 'center',
        minHeight: expanded ? 44 : 64,
        mt: 0,
        mb: expanded ? 2.5 : 1.5,
        gap: expanded ? 0 : 0.5,
      }}
    >
      <Box
        component={Link}
        to="/"
        aria-label="Bubllio home"
        sx={{
          width: expanded ? 'auto' : 36,
          height: 36,
          flexShrink: 0,
          textDecoration: 'none',
          '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
        }}
      >
        <BrandLogo compact={!expanded} />
      </Box>
      {onToggle ? (
        <Tooltip title={toggleLabel} placement="right">
          <IconButton
            aria-label={toggleLabel}
            onClick={onToggle}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            }}
          >
            <AppIcon icon={expanded ? chevronLeftIcon : chevronRightIcon} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>
  )
}
