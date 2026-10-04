import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import SecurityRounded from '@mui/icons-material/SecurityRounded'
import { useProductionReadiness } from '../hooks/useProductionReadiness'

export function ProductionReadinessCard() {
  const readiness = useProductionReadiness(true)

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', gap: 2 }}
        >
          <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.25 }}>
            <SecurityRounded color="primary" />
            <Box>
              <Typography variant="h6" component="h2">
                Production readiness
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Application-level security checks for this self-hosted installation.
              </Typography>
            </Box>
          </Stack>
          {readiness.data && (
            <Chip
              label={readiness.data.ready ? 'Ready for production' : 'Needs attention'}
              color={readiness.data.ready ? 'success' : 'warning'}
            />
          )}
        </Stack>

        {readiness.isPending && (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Checking configuration…</Typography>
          </Stack>
        )}
        {readiness.isError && (
          <Alert
            severity="error"
            action={<Button onClick={() => void readiness.refetch()}>Retry</Button>}
          >
            The production checks could not be loaded.
          </Alert>
        )}
        {readiness.data && (
          <>
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {readiness.data.passed} of {readiness.data.total} checks passed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round((readiness.data.passed / readiness.data.total) * 100)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(readiness.data.passed / readiness.data.total) * 100}
                color={readiness.data.ready ? 'success' : 'warning'}
              />
            </Box>
            <Divider />
            <Stack spacing={2}>
              {readiness.data.checks.map((check) => {
                const passed = check.status === 'pass'
                return (
                  <Stack
                    key={check.key}
                    direction="row"
                    sx={{ alignItems: 'flex-start', gap: 1.5 }}
                  >
                    {passed ? (
                      <CheckCircleOutlineRounded color="success" fontSize="small" />
                    ) : (
                      <ErrorOutlineRounded color="warning" fontSize="small" />
                    )}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {check.label}
                      </Typography>
                      {!passed && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {check.guidance}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                )
              })}
            </Stack>
            <Alert severity="info">
              Also verify TLS termination, firewall rules, backups, and monitoring at the hosting or
              reverse-proxy layer.
            </Alert>
          </>
        )}
      </Stack>
    </Paper>
  )
}
