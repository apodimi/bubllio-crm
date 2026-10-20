import databaseIcon from '@iconify-icons/keyline-icons/database'
import { Alert, Button, Stack } from '@mui/material'

import { AccountSettingsSection } from './AccountSettingsSection'

export function PrivacyDataSection({
  deleteErrorMessage,
  exportErrorMessage,
  isExporting,
  onExport,
  onOpenDelete,
}: {
  deleteErrorMessage?: string
  exportErrorMessage?: string
  isExporting: boolean
  onExport: () => void
  onOpenDelete: () => void
}) {
  return (
    <AccountSettingsSection
      title="Privacy & data"
      description="Download the personal data Bubllio stores for your account, or request account deletion. Workspace CRM data remains controlled by each workspace."
      icon={databaseIcon}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button variant="outlined" onClick={onExport} disabled={isExporting}>
          {isExporting ? 'Preparing download…' : 'Download my data'}
        </Button>
        <Button color="error" variant="text" onClick={onOpenDelete}>
          Delete my account
        </Button>
      </Stack>
      {deleteErrorMessage ? <Alert severity="error">{deleteErrorMessage}</Alert> : null}
      {exportErrorMessage ? <Alert severity="error">{exportErrorMessage}</Alert> : null}
    </AccountSettingsSection>
  )
}
