import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Failure, Loading } from '../../components/common/Feedback'
import { useInstallationSettings } from '../../features/organizations/hooks/useInstallationSettings'

export function AccountSettingsPage() {
  const { settings, save } = useInstallationSettings()
  const account = settings.data?.smtp
  const [values, setValues] = useState({
    name: 'Installation SMTP',
    host: '',
    port: '587',
    username: '',
    password: '',
    from_email: '',
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

  if (settings.isPending) return <Loading />
  if (settings.isError)
    return <Failure error={settings.error} retry={() => void settings.refetch()} />

  async function submit(event: FormEvent) {
    event.preventDefault()
    const { password, ...smtpValues } = values
    await save.mutateAsync({
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
          Installation-wide settings used as the fallback for workspaces without their own SMTP.
        </Typography>
      </Box>
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
            <Button type="submit" variant="contained" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save fallback SMTP'}
            </Button>
            {save.isError && <Alert severity="error">{save.error.message}</Alert>}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
