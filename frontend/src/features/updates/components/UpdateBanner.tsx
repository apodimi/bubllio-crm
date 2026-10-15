import { Link } from '@tanstack/react-router'
import { Alert, AlertTitle, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useUpdateStatus } from '../hooks/useUpdateStatus'

interface UpdateBannerProps {
  isInstallationAdmin: boolean
}

export function UpdateBanner({ isInstallationAdmin }: UpdateBannerProps) {
  const { t } = useTranslation()
  const update = useUpdateStatus(isInstallationAdmin)
  const status = update.data

  if (!status?.update_available || !status.latest_version || !status.release_url) return null

  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
      action={
        <Button
          component={Link}
          to="/account/settings"
          hash="update-center"
          color="inherit"
          size="small"
        >
          {t('updates.openUpdateCenter')}
        </Button>
      }
    >
      <AlertTitle>{t('updates.updateAvailable', { version: status.latest_version })}</AlertTitle>
      {t('updates.runningVersion', { version: status.current_version })}
    </Alert>
  )
}
