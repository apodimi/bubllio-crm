import { Box, Typography } from '@mui/material'

export function SettingsSectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Box sx={{ pb: 1 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 750, letterSpacing: '-.025em' }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 660 }}>
        {description}
      </Typography>
    </Box>
  )
}
