import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Failure, Loading } from '../../components/common/Feedback'
import { useInstallationSettings } from '../../features/organizations/hooks/useInstallationSettings'
import { useAccountSettings } from '../../features/auth/hooks/useAccountSettings'
import { useAuthStore } from '../../features/auth/store/authStore'

export function AccountSettingsPage() {
  const isSuperuser = useAuthStore((state) => state.user?.is_superuser ?? false)
  const accountSettings = useAccountSettings()
  const installation = useInstallationSettings(isSuperuser)
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
  }, [profile])

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
    await accountSettings.save.mutateAsync(profileValues)
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

  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <Box>
        <Typography variant="h4">Account settings</Typography>
        <Typography color="text.secondary">
          Manage your profile and security preferences.
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack component="form" onSubmit={saveProfile} spacing={2}>
          <Typography variant="h6">Profile</Typography>
          {(['display_name', 'first_name', 'last_name', 'email'] as const).map((field) => (
            <TextField
              key={field}
              label={
                field === 'display_name' ? 'Display name' : field[0].toUpperCase() + field.slice(1)
              }
              type={field === 'email' ? 'email' : 'text'}
              value={profileValues[field]}
              onChange={(event) =>
                setProfileValues((current) => ({ ...current, [field]: event.target.value }))
              }
              required={field === 'email'}
            />
          ))}
          <Button type="submit" variant="contained" disabled={accountSettings.save.isPending}>
            {accountSettings.save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
          {accountSettings.save.isError && (
            <Alert severity="error">{accountSettings.save.error.message}</Alert>
          )}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack component="form" onSubmit={changePassword} spacing={2}>
          <Typography variant="h6">Password</Typography>
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
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Fallback SMTP</Typography>
            {account ? (
              <Alert severity="success">
                Configured with {account.host} and used when a workspace has no SMTP override.
              </Alert>
            ) : (
              <Alert severity="info">No installation fallback SMTP is configured yet.</Alert>
            )}
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
    </Stack>
  )
}
