import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from '@tanstack/react-router'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useOrganizationSettings } from '../../features/organizations/hooks/useOrganizationSettings'
import { Loading, Failure } from '../../components/common/Feedback'

export function SettingsPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' })
  const { settings, accounts, createAccount, updateAccount } =
    useOrganizationSettings(organizationId)
  const [values, setValues] = useState({
    name: 'Workspace SMTP',
    host: '',
    port: '587',
    username: '',
    password: '',
    from_email: '',
  })
  if (settings.isPending || accounts.isPending) return <Loading />
  if (settings.isError || accounts.isError)
    return (
      <Failure
        error={settings.error ?? accounts.error ?? new Error('Could not load settings.')}
        retry={() => {
          void settings.refetch()
          void accounts.refetch()
        }}
      />
    )
  const account = accounts.data.find((item) => item.is_default && item.is_active)
  async function save(event: FormEvent) {
    event.preventDefault()
    const body = {
      ...values,
      port: Number(values.port),
      is_default: true,
      is_active: true,
      use_tls: true,
      use_ssl: false,
    }
    if (account) {
      await updateAccount.mutateAsync({ accountId: account.id, body })
    } else {
      await createAccount.mutateAsync(body)
    }
  }
  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <Box>
        <Typography variant="h4">Workspace settings</Typography>
        <Typography color="text.secondary">
          Configure this workspace's identity and email delivery.
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Email delivery</Typography>
          <Typography color="text.secondary">
            A workspace SMTP account is used first. If none is configured, invitations use the
            installation fallback SMTP from first setup.
          </Typography>
          {account && (
            <Alert severity="success">
              Using {account.name} ({account.host}) as this workspace's default SMTP.
            </Alert>
          )}{' '}
          {!account && (
            <Alert severity="info">
              This workspace has no SMTP override and will use the installation fallback when
              available.
            </Alert>
          )}
          <Stack component="form" onSubmit={save} spacing={2}>
            <Typography variant="subtitle2">
              {account ? 'Replace workspace SMTP credentials' : 'Add workspace SMTP'}
            </Typography>
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
              required
            />
            <Button
              type="submit"
              variant="contained"
              disabled={createAccount.isPending || updateAccount.isPending}
            >
              {createAccount.isPending || updateAccount.isPending ? 'Saving…' : 'Save SMTP account'}
            </Button>
            {(createAccount.isError || updateAccount.isError) && (
              <Alert severity="error">
                {(createAccount.error ?? updateAccount.error)?.message}
              </Alert>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
