import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded'
import ShieldOutlined from '@mui/icons-material/ShieldOutlined'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import { Failure, Loading } from '../../components/common/Feedback'
import { useInstallationSettings } from '../../features/organizations/hooks/useInstallationSettings'
import { useInstallationAdministrators } from '../../features/organizations/hooks/useInstallationAdministrators'
import { useAccountSettings } from '../../features/auth/hooks/useAccountSettings'
import { authService } from '../../features/auth/services/authService'
import { useAuthStore } from '../../features/auth/store/authStore'

export function AccountSettingsPage() {
  const isSuperuser = useAuthStore((state) => state.user?.is_superuser ?? false)
  const accountSettings = useAccountSettings()
  const installation = useInstallationSettings(isSuperuser)
  const administrators = useInstallationAdministrators(isSuperuser)
  const account = installation.settings.data?.smtp
  const profile = accountSettings.settings.data
  const [values, setValues] = useState({
    name: 'Installation SMTP',
    host: '',
    port: '587',
    username: '',
    password: '',
    from_email: '',
  })
  const [profileValues, setProfileValues] = useState({
    email: '',
    display_name: '',
    first_name: '',
    last_name: '',
  })
  const [passwordValues, setPasswordValues] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [allowPersonalWorkspaces, setAllowPersonalWorkspaces] = useState(false)
  const [administratorEmail, setAdministratorEmail] = useState('')

  useEffect(() => {
    if (!account) return
    setValues((current) => ({
      ...current,
      name: account.name,
      host: account.host,
      port: String(account.port),
      username: account.username,
      from_email: account.from_email,
    }))
  }, [account])
  useEffect(() => {
    if (!profile) return
    setProfileValues({
      email: profile.email,
      display_name: profile.display_name,
      first_name: profile.first_name,
      last_name: profile.last_name,
    })
    setMarketingConsent(profile.marketing_consent)
  }, [profile])
  useEffect(() => {
    if (installation.settings.data) {
      setAllowPersonalWorkspaces(installation.settings.data.allow_personal_workspaces)
    }
  }, [installation.settings.data])

  if (accountSettings.settings.isPending || (isSuperuser && installation.settings.isPending))
    return <Loading />
  if (accountSettings.settings.isError || (isSuperuser && installation.settings.isError))
    return (
      <Failure
        error={
          accountSettings.settings.error ??
          installation.settings.error ??
          new Error('Could not load account settings.')
        }
        retry={() => {
          void accountSettings.settings.refetch()
          if (isSuperuser) void installation.settings.refetch()
        }}
      />
    )

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    await accountSettings.save.mutateAsync({
      ...profileValues,
      marketing_consent: marketingConsent,
      privacy_policy_accepted: true,
    })
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (passwordValues.new_password !== passwordValues.confirm_password) return
    await accountSettings.changePassword.mutateAsync({
      current_password: passwordValues.current_password,
      new_password: passwordValues.new_password,
    })
    setPasswordValues({ current_password: '', new_password: '', confirm_password: '' })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const { password, ...smtpValues } = values
    await installation.save.mutateAsync({
      ...smtpValues,
      port: Number(values.port),
      ...(password ? { password } : {}),
      is_default: true,
      is_active: true,
      use_tls: true,
      use_ssl: false,
    })
    setValues((current) => ({ ...current, password: '' }))
  }

  async function exportAccount() {
    const response = await authService.exportAccount()
    const file = response.data
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bubllio-account-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function deleteAccount() {
    await accountSettings.deleteAccount.mutateAsync({
      password: deletePassword,
      confirmation: deleteConfirmation,
    })
    useAuthStore.getState().clearSession()
    window.location.assign('/')
  }

  async function inviteAdministrator(event: FormEvent) {
    event.preventDefault()
    await administrators.invite.mutateAsync(administratorEmail.trim())
    setAdministratorEmail('')
  }

  return (
    <Stack spacing={3.5} sx={{ maxWidth: 980 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}
          >
            {(profile?.display_name || profile?.username || '?').slice(0, 1).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4">Account settings</Typography>
            <Typography color="text.secondary">
              Manage your profile and security preferences.
            </Typography>
          </Box>
        </Stack>
        <Chip
          label={isSuperuser ? 'Installation administrator' : 'Workspace member'}
          color="primary"
          variant="outlined"
        />
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
        <Stack component="form" onSubmit={saveProfile} spacing={2}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <PersonOutlineRounded color="primary" />
            <Box>
              <Typography variant="h6">Profile</Typography>
              <Typography variant="body2" color="text.secondary">
                How your name and email appear across Bubllio.
              </Typography>
            </Box>
          </Stack>
          <TextField
            label="Email"
            type="email"
            value={profileValues.email}
            onChange={(event) =>
              setProfileValues((current) => ({ ...current, email: event.target.value }))
            }
            required
          />
          <TextField
            label="Display name"
            value={profileValues.display_name}
            onChange={(event) =>
              setProfileValues((current) => ({ ...current, display_name: event.target.value }))
            }
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              sx={{ flex: 1 }}
              label="First name"
              value={profileValues.first_name}
              onChange={(event) =>
                setProfileValues((current) => ({ ...current, first_name: event.target.value }))
              }
            />
            <TextField
              sx={{ flex: 1 }}
              label="Last name"
              value={profileValues.last_name}
              onChange={(event) =>
                setProfileValues((current) => ({ ...current, last_name: event.target.value }))
              }
            />
          </Stack>
          <FormControlLabel
            control={
              <Checkbox
                checked={marketingConsent}
                onChange={(event) => setMarketingConsent(event.target.checked)}
              />
            }
            label="I agree to receive optional product updates by email."
          />
          <Button type="submit" variant="contained" disabled={accountSettings.save.isPending}>
            {accountSettings.save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
          {accountSettings.save.isError && (
            <Alert severity="error">{accountSettings.save.error.message}</Alert>
          )}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Privacy & data</Typography>
          <Typography variant="body2" color="text.secondary">
            Download the personal data Bubllio stores for your account, or request account deletion.
            Workspace CRM data remains controlled by each workspace.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="outlined" onClick={() => void exportAccount()}>
              Download my data
            </Button>
            <Button color="error" variant="text" onClick={() => setDeleteOpen(true)}>
              Delete my account
            </Button>
          </Stack>
          {accountSettings.deleteAccount.isError && (
            <Alert severity="error">{accountSettings.deleteAccount.error.message}</Alert>
          )}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
        <Stack component="form" onSubmit={changePassword} spacing={2}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <ShieldOutlined color="primary" />
            <Box>
              <Typography variant="h6">Password</Typography>
              <Typography variant="body2" color="text.secondary">
                Use a unique password to keep your account secure.
              </Typography>
            </Box>
          </Stack>
          <TextField
            label="Current password"
            type="password"
            value={passwordValues.current_password}
            onChange={(event) =>
              setPasswordValues((current) => ({ ...current, current_password: event.target.value }))
            }
            required
          />
          <TextField
            label="New password"
            type="password"
            value={passwordValues.new_password}
            onChange={(event) =>
              setPasswordValues((current) => ({ ...current, new_password: event.target.value }))
            }
            required
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={passwordValues.confirm_password}
            onChange={(event) =>
              setPasswordValues((current) => ({ ...current, confirm_password: event.target.value }))
            }
            required
            error={Boolean(
              passwordValues.confirm_password &&
              passwordValues.new_password !== passwordValues.confirm_password,
            )}
            helperText={
              passwordValues.confirm_password &&
              passwordValues.new_password !== passwordValues.confirm_password
                ? 'Passwords do not match.'
                : undefined
            }
          />
          <Button
            type="submit"
            variant="outlined"
            disabled={
              accountSettings.changePassword.isPending ||
              passwordValues.new_password !== passwordValues.confirm_password
            }
          >
            {accountSettings.changePassword.isPending ? 'Updating…' : 'Change password'}
          </Button>
          {accountSettings.changePassword.isError && (
            <Alert severity="error">{accountSettings.changePassword.error.message}</Alert>
          )}
        </Stack>
      </Paper>
      {isSuperuser && (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <ShieldOutlined color="primary" />
              <Box>
                <Typography variant="h6">Installation administrators</Typography>
                <Typography variant="body2" color="text.secondary">
                  Invite trusted IT colleagues to manage this installation. Workspace data still
                  requires a separate membership in the application.
                </Typography>
              </Box>
            </Stack>
            <Stack
              component="form"
              onSubmit={inviteAdministrator}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
            >
              <TextField
                label="Administrator email"
                type="email"
                value={administratorEmail}
                onChange={(event) => setAdministratorEmail(event.target.value)}
                required
                sx={{ flex: 1 }}
              />
              <Button type="submit" variant="contained" disabled={administrators.invite.isPending}>
                {administrators.invite.isPending ? 'Sending…' : 'Send invitation'}
              </Button>
            </Stack>
            {administrators.invite.isError && (
              <Alert severity="error">{administrators.invite.error.message}</Alert>
            )}
            {administrators.invite.isSuccess && <Alert severity="success">Invitation sent.</Alert>}
            {administrators.list.data && (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">Active administrators</Typography>
                {administrators.list.data.administrators.map((admin) => (
                  <Typography key={admin.id} variant="body2">
                    {admin.username} · {admin.email}
                  </Typography>
                ))}
                <Typography variant="subtitle2" sx={{ pt: 1 }}>
                  Pending invitations
                </Typography>
                {administrators.list.data.invitations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None
                  </Typography>
                ) : (
                  administrators.list.data.invitations.map((invitation) => (
                    <Typography key={invitation.id} variant="body2">
                      {invitation.email}
                    </Typography>
                  ))
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
      {isSuperuser && (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <EmailOutlined color="primary" />
              <Box>
                <Typography variant="h6">Fallback SMTP</Typography>
                <Typography variant="body2" color="text.secondary">
                  Used by workspaces without their own email account.
                </Typography>
              </Box>
            </Stack>
            {account ? (
              <Alert severity="success">
                Configured with {account.host} and used when a workspace has no SMTP override.
              </Alert>
            ) : (
              <Alert severity="info">No installation fallback SMTP is configured yet.</Alert>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={allowPersonalWorkspaces}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    setAllowPersonalWorkspaces(enabled)
                    void installation.save.mutateAsync({ allow_personal_workspaces: enabled })
                  }}
                />
              }
              label="Allow users to create personal workspaces"
            />
            <Stack component="form" onSubmit={submit} spacing={2}>
              {(['name', 'host', 'port', 'username', 'from_email'] as const).map((field) => (
                <TextField
                  key={field}
                  label={
                    field === 'from_email'
                      ? 'Sender email address'
                      : field[0].toUpperCase() + field.slice(1)
                  }
                  type={field === 'port' ? 'number' : field === 'from_email' ? 'email' : 'text'}
                  value={values[field]}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field]: event.target.value }))
                  }
                  required
                />
              ))}
              <TextField
                label="SMTP password"
                type="password"
                value={values.password}
                onChange={(event) =>
                  setValues((current) => ({ ...current, password: event.target.value }))
                }
                required={!account}
                helperText={
                  account ? 'Enter it again only when replacing the stored credentials.' : undefined
                }
              />
              <Button type="submit" variant="contained" disabled={installation.save.isPending}>
                {installation.save.isPending ? 'Saving…' : 'Save fallback SMTP'}
              </Button>
              {installation.save.isError && (
                <Alert severity="error">{installation.save.error.message}</Alert>
              )}
            </Stack>
          </Stack>
        </Paper>
      )}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete account?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This is permanent. Transfer workspace ownership first if you own a workspace.
            </Typography>
            <TextField
              label="Current password"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              required
            />
            <TextField
              label="Type DELETE to confirm"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void deleteAccount()}
            disabled={
              deleteConfirmation !== 'DELETE' ||
              !deletePassword ||
              accountSettings.deleteAccount.isPending
            }
          >
            Delete account
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
