import historyIcon from '@iconify-icons/keyline-icons/history'
import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import type { InstallationUpdateRun, UpdateRunStatus } from '../../../types/update.types'

const SUCCESSFUL_RUNS = new Set<UpdateRunStatus>(['succeeded'])
const FAILED_RUNS = new Set<UpdateRunStatus>(['failed', 'rolled_back', 'manual_intervention'])
const EVENT_LABEL_KEYS = {
  requested: 'updates.event_requested',
  preflight_started: 'updates.event_preflight_started',
  agent_accepted: 'updates.event_agent_accepted',
  agent_reconnected: 'updates.event_agent_reconnected',
  backing_up: 'updates.event_backing_up',
  deploying: 'updates.event_deploying',
  verifying: 'updates.event_verifying',
  succeeded: 'updates.event_succeeded',
  failed: 'updates.event_failed',
  rolled_back: 'updates.event_rolled_back',
  manual_intervention: 'updates.event_manual_intervention',
} as const

function eventLabelKey(action: string) {
  return EVENT_LABEL_KEYS[action as keyof typeof EVENT_LABEL_KEYS] ?? 'updates.event_unknown'
}

function runSeverity(status: UpdateRunStatus): 'success' | 'error' | 'info' {
  if (SUCCESSFUL_RUNS.has(status)) {
    return 'success'
  }
  if (FAILED_RUNS.has(status)) {
    return 'error'
  }
  return 'info'
}

export function UpdateProgress({ run }: { run: InstallationUpdateRun }) {
  const { t } = useTranslation()
  const progress = Math.min(100, Math.max(0, run.progress))
  let title = t('updates.progressTitle')
  if (SUCCESSFUL_RUNS.has(run.status)) {
    title = t('updates.completedTitle')
  } else if (FAILED_RUNS.has(run.status)) {
    title = t('updates.failedTitle')
  }

  return (
    <Stack spacing={2} aria-live="polite">
      {run.agent_connected === false || run.state_fresh === false ? (
        <Alert severity="warning">{t('updates.staleRunStatus')}</Alert>
      ) : null}
      <Alert severity={runSeverity(run.status)}>
        <Typography variant="subtitle2">{title}</Typography>
        {run.failure_message || run.phase_label || t('updates.progressFallback')}
      </Alert>
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t(`updates.${run.status}`)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {progress}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label={run.phase_label || t(`updates.${run.status}`)}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>
      <Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
          <AppIcon icon={historyIcon} size={18} />
          <Typography variant="subtitle2">{t('updates.history')}</Typography>
        </Stack>
        {run.events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('updates.historyEmpty')}
          </Typography>
        ) : (
          <Stack component="ol" sx={{ p: 0, m: 0, listStyle: 'none' }}>
            {run.events.map((event, index) => (
              <Stack
                component="li"
                key={event.id}
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  gap: { xs: 0.25, sm: 2 },
                  justifyContent: 'space-between',
                  py: 1,
                  borderBottom: index === run.events.length - 1 ? 0 : 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {t(eventLabelKey(event.action))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {event.actor
                    ? t('updates.event_by_actor', {
                        actor: event.actor,
                        date: new Date(event.created_at).toLocaleString(),
                      })
                    : new Date(event.created_at).toLocaleString()}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
