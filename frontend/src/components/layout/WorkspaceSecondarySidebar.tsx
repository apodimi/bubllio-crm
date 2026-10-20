import briefcaseIcon from '@iconify-icons/keyline-icons/briefcase'
import { Link } from '@tanstack/react-router'
import { Box, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../common/AppIcon'

type WorkspaceSecondarySidebarProps = {
  organizationId: string
  currentPath: string
}

export function WorkspaceSecondarySidebar({
  organizationId,
  currentPath,
}: WorkspaceSecondarySidebarProps) {
  const { t } = useTranslation()
  const basePath = `/organizations/${organizationId}/services`
  const items = [
    {
      text: t('navigation.customerServices'),
      to: '/organizations/$organizationId/services/customer-services' as const,
      path: `${basePath}/customer-services`,
    },
    {
      text: t('navigation.billing'),
      to: '/organizations/$organizationId/services/billing' as const,
      path: `${basePath}/billing`,
    },
    {
      text: t('navigation.catalog'),
      to: '/organizations/$organizationId/services/catalog' as const,
      path: `${basePath}/catalog`,
    },
  ]

  return (
    <Box
      component="nav"
      aria-label={t('navigation.servicesNavigation')}
      sx={{
        display: { xs: 'none', md: 'block' },
        width: 216,
        flexShrink: 0,
        minHeight: '100dvh',
        bgcolor: 'background.default',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Stack sx={{ position: 'sticky', top: 0, p: 2, gap: 1.75 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minHeight: 40 }}>
          <Box sx={{ display: 'grid', placeItems: 'center', color: 'primary.main' }}>
            <AppIcon icon={briefcaseIcon} />
          </Box>
          <Typography component="h2" variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            {t('navigation.services')}
          </Typography>
        </Stack>
        <List disablePadding sx={{ display: 'grid', gap: 0.35 }}>
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.to}
              params={{ organizationId }}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <ListItemButton
                component="div"
                selected={currentPath === item.path || currentPath === `${item.path}/`}
                sx={{
                  position: 'relative',
                  minHeight: 40,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 0.5,
                  '@media (pointer: coarse)': { minHeight: 44 },
                  '&.Mui-selected, &.Mui-selected:hover': {
                    bgcolor: 'transparent',
                    color: 'primary.main',
                  },
                  '&.Mui-selected::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 7,
                    bottom: 7,
                    width: '1px',
                    bgcolor: 'primary.main',
                  },
                }}
              >
                <ListItemText
                  primary={item.text}
                  slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: 600 } } }}
                />
              </ListItemButton>
            </Link>
          ))}
        </List>
      </Stack>
    </Box>
  )
}
