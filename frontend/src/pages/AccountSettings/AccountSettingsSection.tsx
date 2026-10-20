import type { PropsWithChildren, ReactNode } from 'react'
import type { IconifyIcon } from '@iconify/react'
import { Box, Paper, Stack, Typography } from '@mui/material'

import { AppIcon } from '../../components/common/AppIcon'

interface AccountSettingsSectionProps extends PropsWithChildren {
  title: string
  description?: string
  icon?: IconifyIcon
}

export function AccountSettingsSection({
  title,
  description,
  icon,
  children,
}: AccountSettingsSectionProps) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3.5 } }}>
      <Stack spacing={2}>
        <SectionHeading title={title} description={description} icon={icon} />
        {children}
      </Stack>
    </Paper>
  )
}

function SectionHeading({
  title,
  description,
  icon,
}: {
  title: string
  description?: string
  icon?: IconifyIcon
}) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
      {icon ? (
        <Box sx={{ color: 'primary.main', display: 'flex' }}>
          <AppIcon icon={icon} />
        </Box>
      ) : null}
      <Box>
        <Typography variant="h6">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  )
}

export function AccountSettingsGroupHeading({
  title,
  description,
}: {
  title: string
  description: ReactNode
}) {
  return (
    <Box>
      <Typography variant="h5">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Box>
  )
}
