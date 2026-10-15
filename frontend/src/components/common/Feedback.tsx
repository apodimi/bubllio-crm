import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
export function Loading() {
  const { t } = useTranslation()
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
      sx={{ py: { xs: 3, md: 5 }, width: '100%' }}
    >
      <Typography
        component="span"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {t('common.loading')}
      </Typography>
      <Stack spacing={1.25} aria-hidden="true">
        <Skeleton variant="rounded" width="32%" height={24} />
        <Skeleton variant="rounded" width="68%" height={14} />
        <Skeleton variant="rounded" width="100%" height={72} sx={{ mt: 1 }} />
      </Stack>
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
    <Stack spacing={0.75} sx={{ px: 3, py: { xs: 5, md: 7 }, textAlign: 'center' }}>
      <Typography variant="h6">{title}</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: '65ch', alignSelf: 'center' }}
      >
        {description}
      </Typography>
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
        mb: 2.5,
      }}
    >
      <Box sx={{ minWidth: 0, maxWidth: '65ch' }}>
        <Typography
          variant="h2"
          component="h1"
          sx={{ mb: 0.5, overflowWrap: 'anywhere', textWrap: 'balance' }}
        >
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: '60ch' }}>
          {description}
        </Typography>
      </Box>
      {action}
    </Stack>
  )
}
