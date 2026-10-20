import { Avatar, Box, Chip, Stack, Typography } from '@mui/material'

export function AccountSettingsHeader({
  displayName,
  username,
  isSuperuser,
}: {
  displayName?: string
  username?: string
  isSuperuser: boolean
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ alignItems: { sm: 'center' }, gap: 2, justifyContent: 'space-between' }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{ bgcolor: 'primary.main', fontSize: 22, fontWeight: 700, height: 56, width: 56 }}
        >
          {(displayName || username || '?').slice(0, 1).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h4">Account settings</Typography>
          <Typography color="text.secondary">
            Manage your own account and, if permitted, the settings used by the whole installation.
          </Typography>
        </Box>
      </Stack>
      <Chip
        label={isSuperuser ? 'Installation administrator' : 'Workspace member'}
        color="primary"
        variant="outlined"
      />
    </Stack>
  )
}
