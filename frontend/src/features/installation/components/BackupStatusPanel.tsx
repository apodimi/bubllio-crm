import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import BackupRounded from '@mui/icons-material/BackupRounded'
import { useBackupStatus } from '../hooks/useBackupStatus'
import { useDataExport } from '../hooks/useDataExport'

function statusLabel(status: string) {
  return (
    {
      current: 'Up to date',
      stale: 'Too old',
      failed: 'Last attempt failed',
      unknown: 'No information yet',
    }[status] ?? 'Unknown'
  )
}

function statusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'current') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'stale') return 'warning'
  return 'default'
}

function completedLabel(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'The backup process has not reported a result.'
}

export function BackupStatusPanel() {
  const status = useBackupStatus(true)
  const dataExport = useDataExport()

  async function downloadDataExport() {
    try {
      const response = await dataExport.mutateAsync()
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `bubllio-data-export-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      // The mutation error is shown below the action.
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
            <BackupRounded color="primary" />
            <Box>
              <Typography variant="h6" component="h2">
                Backup health
              </Typography>
              <Typography variant="body2" color="text.secondary">
                See whether your data was copied recently and whether recovery has been tested.
              </Typography>
            </Box>
          </Stack>
          <Button onClick={() => void status.refetch()} disabled={status.isFetching}>
            {status.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </Stack>
        {status.isError && (
          <Alert severity="error">We could not load the backup information. Try again.</Alert>
        )}
        {status.data && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2">Latest backup</Typography>
                  <Chip
                    size="small"
                    label={statusLabel(status.data.backup.status)}
                    color={statusColor(status.data.backup.status)}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {completedLabel(status.data.backup.completed_at)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Expected within {status.data.backup_max_age_hours} hours
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2">Latest recovery test</Typography>
                  <Chip
                    size="small"
                    label={statusLabel(status.data.restore_test.status)}
                    color={statusColor(status.data.restore_test.status)}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {completedLabel(status.data.restore_test.completed_at)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  A recovery test should be completed every {status.data.restore_test_max_age_days}{' '}
                  days
                </Typography>
              </Box>
            </Stack>
            {(status.data.backup.status !== 'current' ||
              status.data.restore_test.status !== 'current') && (
              <Alert severity="warning">
                Set up a daily database backup through your hosting provider or server. After each
                real backup completes, configure that process to report success or failure to
                Bubllio. Follow the Installation Settings guide for the exact command.
              </Alert>
            )}
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2">Keep a local copy of your business data</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                Download workspaces, members, companies, contacts, automations, and non-secret
                settings as a JSON file. Passwords, sign-in tokens, and saved email passwords are
                excluded.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => void downloadDataExport()}
                disabled={dataExport.isPending}
              >
                {dataExport.isPending ? 'Preparing data…' : 'Download data export'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Store the file securely. It contains customer and contact information and is not a
                full database backup that Bubllio can restore automatically.
              </Typography>
            </Box>
            {dataExport.isSuccess && (
              <Alert severity="success">The data export was downloaded and recorded in the access history.</Alert>
            )}
            {dataExport.isError && (
              <Alert severity="error">We could not prepare the data export. Try again.</Alert>
            )}
          </>
        )}
      </Stack>
    </Paper>
  )
}
