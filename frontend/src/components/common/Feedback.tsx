import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
export function Loading() {
  return (
    <Box role="status" sx={{ p: 6, textAlign: 'center' }}>
      <CircularProgress size={26} aria-label="Loading" />
    </Box>
  )
}
export function Failure({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        retry && (
          <Button color="inherit" onClick={retry}>
            Retry
          </Button>
        )
      }
    >
      {error.message}
    </Alert>
  )
}
export function Empty({ title, description }: { title: string; description: string }) {
  return (
    <Stack spacing={1} sx={{ p: 6, textAlign: 'center' }}>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Stack>
  )
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2,
        mb: 4,
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>
      {action}
    </Stack>
  )
}
