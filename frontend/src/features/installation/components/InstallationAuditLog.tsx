import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import { useInstallationAuditLog } from '../hooks/useInstallationAuditLog'

export function InstallationAuditLog() {
  const events = useInstallationAuditLog(true)

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
            <HistoryRounded color="primary" />
            <Box>
              <Typography variant="h6" component="h2">
                Access and workspace history
              </Typography>
              <Typography variant="body2" color="text.secondary">
                See important changes to workspaces, members, email connections, and installation
                settings.
              </Typography>
            </Box>
          </Stack>
          <Button onClick={() => void events.refetch()} disabled={events.isFetching}>
            {events.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </Stack>
        {events.isError && (
          <Alert severity="error">We could not load the access history. Try again.</Alert>
        )}
        {events.data?.length === 0 && (
          <Typography color="text.secondary">
            No access or workspace changes have been recorded yet.
          </Typography>
        )}
        {events.data && events.data.length > 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Installation activity">
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Performed by</TableCell>
                  <TableCell>User affected</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Workspace reference</TableCell>
                  <TableCell>Date and time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.data.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.action}</TableCell>
                    <TableCell>{event.actor}</TableCell>
                    <TableCell>{event.target ?? '—'}</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      {Object.entries(event.details)
                        .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                        .join(' · ') || '—'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {event.organization_id ?? '—'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(event.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          This list shows the latest 100 important administration changes. Passwords, invitation
          links, and other secret values are never included.
        </Typography>
      </Stack>
    </Paper>
  )
}
