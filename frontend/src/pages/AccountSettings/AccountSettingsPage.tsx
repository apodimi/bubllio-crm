import { useState } from 'react'
import { Stack } from '@mui/material'

import { Failure, Loading } from '../../components/common/Feedback'
import { useAccountSettings } from '../../features/auth/hooks/useAccountSettings'
import { useAuthStore } from '../../features/auth/store/authStore'
import { useOrganizations } from '../../features/organizations'
import { useInstallationAdministrators } from '../../features/organizations/hooks/useInstallationAdministrators'
import { useInstallationSettings } from '../../features/organizations/hooks/useInstallationSettings'

import { AccountSettingsHeader } from './AccountSettingsHeader'
import { AccountSettingsGroupHeading } from './AccountSettingsSection'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import { InstallationAdministratorsSection } from './InstallationAdministratorsSection'
import { InstallationEmailSection } from './InstallationEmailSection'
import { InstallationOperationsSection } from './InstallationOperationsSection'
import { PasswordSection } from './PasswordSection'
import { PrivacyDataSection } from './PrivacyDataSection'
import { ProfileSection } from './ProfileSection'
import { WorkspaceSettingsSection } from './WorkspaceSettingsSection'
import { downloadAccountExport } from './downloadAccountExport'

export function AccountSettingsPage() {
  const isSuperuser = useAuthStore(
    (state) => state.user?.can_create_workspaces ?? state.user?.is_superuser ?? false,
  )
  const accountSettings = useAccountSettings()
  const organizations = useOrganizations()
  const installation = useInstallationSettings(isSuperuser)
  const administrators = useInstallationAdministrators(isSuperuser)
  const profile = accountSettings.settings.data
  const emailAccount = installation.settings.data?.smtp
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  if (accountSettings.settings.isPending || (isSuperuser && installation.settings.isPending)) {
    return <Loading />
  }
  if (accountSettings.settings.isError || (isSuperuser && installation.settings.isError)) {
    return (
      <Failure
        error={
          accountSettings.settings.error ??
          installation.settings.error ??
          new Error('Could not load account settings.')
        }
        retry={() => {
          void accountSettings.settings.refetch()
          if (isSuperuser) {
            void installation.settings.refetch()
          }
        }}
      />
    )
  }

  async function exportAccount() {
    try {
      const response = await accountSettings.exportAccount.mutateAsync()
      downloadAccountExport(response.data)
    } catch {
      // The mutation exposes the actionable error beside the export control.
    }
  }

  async function deleteAccount() {
    await accountSettings.deleteAccount.mutateAsync({
      password: deletePassword,
      confirmation: deleteConfirmation,
    })
    useAuthStore.getState().clearSession()
    window.location.assign('/')
  }

  return (
    <Stack spacing={3.5} sx={{ maxWidth: 980 }}>
      <AccountSettingsHeader
        displayName={profile?.display_name}
        username={profile?.username}
        isSuperuser={isSuperuser}
      />
      <WorkspaceSettingsSection organizations={organizations.data} />
      <AccountSettingsGroupHeading
        title="Your account"
        description="These settings affect only your own profile and sign-in."
      />
      <ProfileSection
        profile={profile}
        isPending={accountSettings.save.isPending}
        errorMessage={accountSettings.save.error?.message}
        onSave={accountSettings.save.mutateAsync}
      />
      <PrivacyDataSection
        deleteErrorMessage={accountSettings.deleteAccount.error?.message}
        exportErrorMessage={accountSettings.exportAccount.error?.message}
        isExporting={accountSettings.exportAccount.isPending}
        onExport={() => void exportAccount()}
        onOpenDelete={() => setDeleteOpen(true)}
      />
      <PasswordSection
        isPending={accountSettings.changePassword.isPending}
        errorMessage={accountSettings.changePassword.error?.message}
        onChangePassword={accountSettings.changePassword.mutateAsync}
      />
      {isSuperuser ? (
        <>
          <AccountSettingsGroupHeading
            title="Installation administration"
            description="These settings affect the whole Bubllio installation and everyone who uses it."
          />
          <InstallationAdministratorsSection
            data={administrators.list.data}
            isPending={administrators.invite.isPending}
            isListPending={administrators.list.isPending}
            listErrorMessage={administrators.list.error?.message}
            isSuccess={administrators.invite.isSuccess}
            errorMessage={administrators.invite.error?.message}
            onInvite={administrators.invite.mutateAsync}
          />
          <InstallationEmailSection
            account={emailAccount}
            isPending={installation.save.isPending}
            errorMessage={installation.save.error?.message}
            onSave={installation.save.mutateAsync}
          />
          <InstallationOperationsSection />
        </>
      ) : null}
      <DeleteAccountDialog
        open={deleteOpen}
        password={deletePassword}
        confirmation={deleteConfirmation}
        pending={accountSettings.deleteAccount.isPending}
        onPasswordChange={setDeletePassword}
        onConfirmationChange={setDeleteConfirmation}
        onClose={() => setDeleteOpen(false)}
        onDelete={() => void deleteAccount()}
      />
    </Stack>
  )
}
