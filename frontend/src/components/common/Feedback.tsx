import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
export function Loading() {
  const { t } = useTranslation()
  return (
    <Box role="status" sx={{ p: 6, textAlign: 'center' }}>
      <CircularProgress size={26} aria-label={t('common.loading')} />
    </Box>
  )
}
export function Failure({ error, retry }: { error: Error; retry?: () => void }) {
  const { t } = useTranslation()
  return (
    <Alert
      severity="error"
      action={
        retry && (
          <Button color="inherit" onClick={retry}>
            {t('common.retry')}
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
  const { t } = useTranslation()
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
      <Box sx={{ maxWidth: 720 }}>
        <Typography
          variant="overline"
          color="primary.main"
          sx={{ letterSpacing: '.14em', fontSize: 10.5 }}
        >
          {t('common.workspace')}
        </Typography>
        <Typography
          variant="h3"
          sx={{ mt: 0.35, mb: 1, fontSize: { xs: 30, md: 38 }, letterSpacing: '-.035em' }}
        >
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>
      {action}
    </Stack>
  )
}
