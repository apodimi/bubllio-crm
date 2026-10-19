import { useEffect, useState } from 'react'
import checkCircle from '@iconify-icons/keyline-icons/circle-check'
import cloudDownload from '@iconify-icons/keyline-icons/cloud-download'
import serverIcon from '@iconify-icons/keyline-icons/server'
import shieldCheck from '@iconify-icons/keyline-icons/shield-check'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import type { UpdateCheck, UpdateMigrationPolicy } from '../../../types/update.types'
import {
  useStartUpdate,
  useUpdateCenterStatus,
  useUpdatePreflight,
  useUpdateRun,
} from '../hooks/useUpdateCenter'
import { UpdateProgress } from './UpdateProgress'

function policyColor(policy: UpdateMigrationPolicy): 'success' | 'warning' | 'error' {
  if (policy === 'online_safe') {
    return 'success'
  }
  if (policy === 'maintenance') {
    return 'warning'
  }
  return 'error'
}

function checkColor(status: UpdateCheck['status']): 'success' | 'warning' | 'error' {
  if (status === 'pass') {
    return 'success'
  }
  if (status === 'warning') {
    return 'warning'
  }
  return 'error'
}

export function UpdateCenter() {
  const { t } = useTranslation()
  const status = useUpdateCenterStatus(true)
  const preflight = useUpdatePreflight()
  const startUpdate = useStartUpdate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const activeRunId = status.data?.active_run?.id ?? startUpdate.data?.id ?? null
  const trackedRun = useUpdateRun(activeRunId)
  const run = trackedRun.data ?? startUpdate.data ?? status.data?.active_run ?? null
  const displayedRun = run ?? status.data?.latest_run ?? null
  const targetVersion = status.data?.latest_version ?? null
  const readiness = preflight.data ?? status.data?.preflight ?? null
  const policy = readiness?.migration_policy ?? null
  const requiresTypedConfirmation = policy !== null && policy !== 'online_safe'
  const canConfirm =
    Boolean(targetVersion) &&
    Boolean(readiness?.eligible) &&
    (!requiresTypedConfirmation || confirmation === targetVersion)

  useEffect(() => {
    setConfirmation('')
    setCurrentPassword('')
  }, [targetVersion])

  async function runPreflight() {
    if (!targetVersion) {
      return
    }
    await preflight.mutateAsync(targetVersion)
  }

  async function beginUpdate() {
    if (!targetVersion || !canConfirm || policy !== 'online_safe' || !currentPassword) {
      return
    }
    const password = currentPassword
    setCurrentPassword('')
    await startUpdate.mutateAsync({ targetVersion, currentPassword: password })
    closeConfirmation()
  }

  function closeConfirmation() {
    setConfirmOpen(false)
    setConfirmation('')
    setCurrentPassword('')
  }

  const releaseUrl = readiness?.manifest.release_url ?? status.data?.release_url
  let confirmationMessage = t('updates.confirmSafe')
  if (policy === 'maintenance') {
    confirmationMessage = t('updates.confirmRisky')
  } else if (policy === 'irreversible') {
    confirmationMessage = t('updates.confirmIrreversible')
  }

  return (
    <Paper
      id="update-center"
      variant="outlined"
      sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, scrollMarginTop: 96 }}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between', gap: 2 }}
        >
          <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.25 }}>
            <Box
              sx={{
                display: 'grid',
                width: 40,
                height: 40,
                flex: '0 0 auto',
                placeItems: 'center',
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              <AppIcon icon={cloudDownload} size={22} />
            </Box>
            <Box>
              <Typography variant="h6" component="h2">
                {t('updates.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('updates.description')}
              </Typography>
            </Box>
          </Stack>
          {status.data && (
            <Chip
              icon={<AppIcon icon={serverIcon} size={17} />}
              size="small"
              color={status.data.connected ? 'success' : 'error'}
              variant="outlined"
              label={status.data.connected ? t('updates.connected') : t('updates.disconnected')}
            />
          )}
        </Stack>

        {status.isPending && <LinearProgress aria-label={t('updates.checking')} />}
        {status.isError && !status.data && (
          <Alert
            severity="error"
            action={<Button onClick={() => void status.refetch()}>{t('updates.refresh')}</Button>}
          >
            {t('updates.loadError')}
          </Alert>
        )}
        {status.isError && status.data && run && (
          <Alert severity="warning">{t('updates.reconnecting')}</Alert>
        )}

        {status.data && !status.data.enabled && (
          <Alert severity="info">
            <Typography variant="subtitle2">{t('updates.notConfigured')}</Typography>
            {t('updates.notConfiguredHelp')}
          </Alert>
        )}
        {status.data?.enabled && !status.data.connected && (
          <Alert severity="error">
            <Typography variant="subtitle2">{t('updates.disconnected')}</Typography>
            {t('updates.disconnectedHelp')}
          </Alert>
        )}

        {status.data && (
          <>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              divider={<Divider flexItem orientation="vertical" />}
              sx={{ gap: { xs: 2, sm: 3 }, alignItems: { sm: 'center' } }}
            >
              <Box sx={{ minWidth: 144 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('updates.current')}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.25 }}>
                  {status.data.current_version}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 144 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('updates.available')}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.25 }}>
                  {targetVersion ?? '—'}
                </Typography>
              </Box>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ gap: 1, ml: { sm: 'auto' }, alignItems: { sm: 'center' } }}
              >
                {releaseUrl && (
                  <Button component={Link} href={releaseUrl} target="_blank" rel="noreferrer">
                    {t('updates.releaseNotes')}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => void status.refetch()}
                  disabled={status.isFetching}
                >
                  {status.isFetching ? t('updates.checking') : t('updates.checkAgain')}
                </Button>
              </Stack>
            </Stack>

            {!status.data.update_available && !run && (
              <Alert severity="success" icon={<AppIcon icon={checkCircle} />}>
                {t('updates.upToDate')}
              </Alert>
            )}
          </>
        )}

        {displayedRun && <UpdateProgress run={displayedRun} />}

        {status.data?.update_available && !run && (
          <>
            <Divider />
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, gap: 2 }}
              >
                <Stack direction="row" sx={{ gap: 1.25, alignItems: 'flex-start' }}>
                  <Box sx={{ color: 'primary.main', mt: 0.25 }}>
                    <AppIcon icon={shieldCheck} size={21} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>
                      {t('updates.preflightTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('updates.preflightHelp')}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant={readiness ? 'text' : 'contained'}
                  onClick={() => void runPreflight()}
                  disabled={!status.data.enabled || !status.data.connected || preflight.isPending}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {preflight.isPending ? t('updates.runningPreflight') : t('updates.runPreflight')}
                </Button>
              </Stack>

              {!readiness && !preflight.isError && (
                <Typography variant="body2" color="text.secondary">
                  {t('updates.preflightEmpty')}
                </Typography>
              )}
              {preflight.isError && <Alert severity="error">{t('updates.preflightError')}</Alert>}
              {readiness && (
                <>
                  <Alert severity={readiness.eligible ? 'success' : 'warning'}>
                    {readiness.eligible
                      ? t('updates.preflightReady')
                      : t('updates.preflightBlocked')}
                  </Alert>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1 }}
                  >
                    <Typography variant="subtitle2">{t('updates.policy')}</Typography>
                    <Chip
                      size="small"
                      color={policyColor(readiness.migration_policy)}
                      label={t(`updates.policy_${readiness.migration_policy}`)}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {t(`updates.policy_${readiness.migration_policy}_help`)}
                    </Typography>
                  </Stack>
                  {readiness.migration_policy !== 'online_safe' && (
                    <Alert severity="warning">{t('updates.manualOnly')}</Alert>
                  )}
                  <Stack component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                    {readiness.checks.map((check, index) => (
                      <Stack
                        component="li"
                        key={check.key}
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{
                          gap: { xs: 0.75, sm: 2 },
                          alignItems: { sm: 'center' },
                          justifyContent: 'space-between',
                          py: 1.25,
                          borderBottom: index === readiness.checks.length - 1 ? 0 : 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                          <Chip
                            size="small"
                            color={checkColor(check.status)}
                            label={check.status}
                            sx={{ minWidth: 72 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            {check.label}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                          {check.guidance}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={() => setConfirmOpen(true)}
                      disabled={!readiness.eligible}
                    >
                      {readiness.migration_policy === 'online_safe'
                        ? t('updates.start')
                        : t('updates.continue')}
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          </>
        )}

        {startUpdate.isError && <Alert severity="error">{t('updates.startError')}</Alert>}
      </Stack>

      <Dialog open={confirmOpen} onClose={closeConfirmation} maxWidth="sm" fullWidth>
        <DialogTitle>{t('updates.confirmTitle', { version: targetVersion })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity={policy === 'online_safe' ? 'info' : 'warning'}>
              {confirmationMessage}
            </Alert>
            {requiresTypedConfirmation && targetVersion && (
              <TextField
                autoFocus
                label={t('updates.typeVersion', { version: targetVersion })}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                error={Boolean(confirmation && confirmation !== targetVersion)}
                helperText={
                  confirmation && confirmation !== targetVersion
                    ? t('updates.confirmationMismatch')
                    : undefined
                }
                autoComplete="off"
              />
            )}
            {policy === 'online_safe' && (
              <TextField
                autoFocus
                type="password"
                label={t('updates.currentPassword')}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                helperText={t('updates.stepUpHelp')}
                autoComplete="current-password"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmation}>{t('updates.cancel')}</Button>
          <Button
            component={requiresTypedConfirmation ? Link : 'button'}
            href={requiresTypedConfirmation ? (releaseUrl ?? undefined) : undefined}
            target={requiresTypedConfirmation ? '_blank' : undefined}
            rel={requiresTypedConfirmation ? 'noreferrer' : undefined}
            variant="contained"
            color={policy === 'irreversible' ? 'error' : 'primary'}
            onClick={requiresTypedConfirmation ? undefined : () => void beginUpdate()}
            disabled={
              !canConfirm ||
              startUpdate.isPending ||
              (policy === 'online_safe' && !currentPassword) ||
              (requiresTypedConfirmation && !releaseUrl)
            }
          >
            {requiresTypedConfirmation
              ? t('updates.confirmManualAction')
              : t('updates.confirmAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
