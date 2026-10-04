import { Alert, AlertTitle, Button } from '@mui/material'
import { useUpdateStatus } from '../hooks/useUpdateStatus'

interface UpdateBannerProps {
  isInstallationAdmin: boolean
}

export function UpdateBanner({ isInstallationAdmin }: UpdateBannerProps) {
  const update = useUpdateStatus(isInstallationAdmin)
  const status = update.data

  if (!status?.update_available || !status.latest_version || !status.release_url) return null

  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
      action={
        <Button
          component="a"
          href={status.release_url}
          target="_blank"
          rel="noreferrer"
          color="inherit"
          size="small"
        >
          View release
        </Button>
      }
    >
      <AlertTitle>Bubllio CRM {status.latest_version} is available</AlertTitle>
      You are running {status.current_version}. Review the release notes and update guide before
      upgrading.
    </Alert>
  )
}
