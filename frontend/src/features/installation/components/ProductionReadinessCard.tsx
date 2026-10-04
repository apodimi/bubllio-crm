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
                Server safety checks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                A plain-language checklist for running this installation safely for real users.
              </Typography>
            </Box>
          </Stack>
          {readiness.data && (
            <Chip
              label={readiness.data.ready ? 'All checks passed' : 'Action needed'}
              color={readiness.data.ready ? 'success' : 'warning'}
            />
          )}
        </Stack>

        {readiness.isPending && (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Checking the server settings…</Typography>
          </Stack>
        )}
        {readiness.isError && (
          <Alert
            severity="error"
            action={<Button onClick={() => void readiness.refetch()}>Retry</Button>}
          >
            We could not check the server settings. Try again.
          </Alert>
        )}
        {readiness.data && (
          <>
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {readiness.data.passed} of {readiness.data.total} safety checks passed
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
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {check.meaning}
                      </Typography>
                      {!passed && (
                        <Box sx={{ mt: 0.75 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            What to do
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {check.guidance}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                )
              })}
            </Stack>
            <Alert severity="info">
              This checks the application settings. Your hosting provider or server administrator
              must also confirm HTTPS, firewall rules, backups, and monitoring.
            </Alert>
          </>
        )}
      </Stack>
    </Paper>
  )
}
