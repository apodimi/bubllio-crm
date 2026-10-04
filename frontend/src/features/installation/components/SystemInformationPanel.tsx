import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import { useSystemInformation } from '../hooks/useSystemInformation'

export function SystemInformationPanel() {
  const information = useSystemInformation(true)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  async function copyReport() {
    if (!information.data) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(information.data, null, 2))
      setCopied(true)
      setCopyFailed(false)
    } catch {
      setCopied(false)
      setCopyFailed(true)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', gap: 1.5 }}
        >
          <Box>
            <Typography variant="h6" component="h2">
              Information for support
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Share these details when somebody is helping you troubleshoot the installation.
            </Typography>
          </Box>
          {information.data && (
            <Button startIcon={<ContentCopyRounded />} onClick={() => void copyReport()}>
              Copy support information
            </Button>
          )}
        </Stack>
        {information.isPending && (
          <Typography color="text.secondary">Collecting support information…</Typography>
        )}
        {information.isError && (
          <Alert
            severity="error"
            action={<Button onClick={() => void information.refetch()}>Retry</Button>}
          >
            We could not load the support information. Try again.
          </Alert>
        )}
        {information.data && (
          <>
            <Table size="small" aria-label="System information">
              <TableBody>
                {[
                  ['Bubllio CRM', information.data.application_version],
                  ['Python', information.data.python_version],
                  ['Django', information.data.django_version],
                  ['Database', information.data.database],
                  ['Email delivery', information.data.email_delivery],
                  ['Runtime', information.data.runtime],
                  ['Public URL', information.data.public_url || 'Not configured'],
                  ['Update checks', information.data.update_check_enabled ? 'Enabled' : 'Disabled'],
                ].map(([label, value]) => (
                  <TableRow key={label}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                      {label}
                    </TableCell>
                    <TableCell>{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {copied && <Alert severity="success">Support information copied.</Alert>}
            {copyFailed && (
              <Alert severity="error">
                Your browser blocked copying. Select and copy the values above manually.
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              This report does not include passwords, secret keys, database login details, or
              customer records.
            </Typography>
          </>
        )}
      </Stack>
    </Paper>
  )
}
