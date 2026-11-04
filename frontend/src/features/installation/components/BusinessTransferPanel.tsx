import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useBusinessTransfer } from '../hooks/useBusinessTransfer'

export function BusinessTransferPanel() {
  const transfer = useBusinessTransfer()

  async function download() {
    try {
      const response = await transfer.mutateAsync()
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `bubllio-crm-business-transfer-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch {
      // The request error is shown below the action.
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" component="h2">
            Move CRM business data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Prepare customers, contacts, deals, tasks, activity history, services, subscriptions,
            charges, payments, and their relationships for import into a fresh Bubllio CRM
            installation.
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            onClick={() => void download()}
            disabled={transfer.isPending}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {transfer.isPending ? 'Preparing transfer…' : 'Download CRM transfer'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          This transfer file contains customer data and member identifiers. Store it securely and
          delete temporary copies after import. It is not a database backup or live sync. Stored
          account passwords, sessions, SMTP credentials, and invitation tokens are excluded.
          Customer notes and other free text may still contain sensitive information.
        </Typography>
        {transfer.isSuccess && (
          <Alert severity="success">Transfer prepared. Check your browser downloads.</Alert>
        )}
        {transfer.isError && (
          <Alert severity="error">We could not prepare the CRM transfer. Try again.</Alert>
        )}
      </Stack>
    </Paper>
  )
}
