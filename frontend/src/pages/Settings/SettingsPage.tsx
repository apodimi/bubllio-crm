import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams } from '@tanstack/react-router'
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { Loading, Failure } from '../../components/common/Feedback'
import {
  emailAccountSchema,
  testRecipientSchema,
} from '../../features/organizations/emailAccountSchema'
import type { EmailAccountFormValues } from '../../features/organizations/emailAccountSchema'
import { useOrganizationSettings } from '../../features/organizations/hooks/useOrganizationSettings'
import type { EmailAccount } from '../../types/organization.types'

function EmailSettings({
  organizationId,
  account,
}: {
  organizationId: string
  account?: EmailAccount
}) {
  const { createAccount, updateAccount, testAccount } = useOrganizationSettings(organizationId)
  const mutation = account ? updateAccount : createAccount
  const [saved, setSaved] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const {
    control,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isDirty },
  } = useForm<EmailAccountFormValues>({
    resolver: zodResolver(emailAccountSchema),
    defaultValues: {
      name: account?.name ?? 'Workspace SMTP',
      host: account?.host ?? '',
      port: String(account?.port ?? 587),
      username: account?.username ?? '',
      password: '',
      from_email: account?.from_email ?? '',
      from_name: account?.from_name ?? '',
      security: account?.use_ssl ? 'ssl' : 'starttls',
    },
  })

  const save = handleSubmit(async (values) => {
    if (!account && !values.password) {
      setError('password', { message: 'SMTP password is required for a new connection.' })
      return
    }
    const body: Record<string, unknown> = {
      name: values.name,
      host: values.host,
      port: Number(values.port),
      username: values.username,
      from_email: values.from_email,
      from_name: values.from_name,
      use_tls: values.security === 'starttls',
      use_ssl: values.security === 'ssl',
      is_default: true,
      is_active: true,
    }
    if (values.password) body.password = values.password
    try {
      if (account) await updateAccount.mutateAsync({ accountId: account.id, body })
      else await createAccount.mutateAsync(body)
      resetField('password', { defaultValue: '' })
      setSaved(true)
    } catch {
      setSaved(false)
    }
  })

  async function sendTest() {
    const parsed = testRecipientSchema.safeParse(testRecipient)
    if (!parsed.success) {
      setRecipientError(parsed.error.issues[0]?.message ?? 'Enter a valid recipient.')
      return
    }
    if (!account) return
    setRecipientError('')
    try {
      await testAccount.mutateAsync({ accountId: account.id, recipient: parsed.data })
    } catch {
      // The mutation error is rendered beside the test controls.
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">Workspace invitation email</Typography>
            {account && (
              <Chip
                size="small"
                color={account.last_test_error ? 'error' : 'success'}
                label={account.last_test_error ? 'Needs attention' : 'Configured'}
              />
            )}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Used for workspace invitations. Automation emails do not use this connection yet.
          </Typography>
        </Box>

        {account ? (
          <Alert severity={account.last_test_error ? 'warning' : 'success'}>
            {account.last_test_error
              ? 'The last test failed. Review the connection and try again.'
              : account.last_tested_at
                ? `Last tested successfully ${new Date(account.last_tested_at).toLocaleString()}.`
                : 'Connection saved but not tested yet.'}
          </Alert>
        ) : (
          <Alert severity="info">
            No workspace connection is configured. Invitations use the installation fallback when
            available.
          </Alert>
        )}

        <Stack component="form" onSubmit={(event) => void save(event)} spacing={2.25}>
          <Typography variant="subtitle2">Connection details</Typography>
          {(['name', 'host', 'username', 'from_email', 'from_name'] as const).map((name) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={
                    {
                      name: 'Connection name',
                      host: 'SMTP hostname',
                      username: 'SMTP username',
                      from_email: 'Sender email address',
                      from_name: 'Sender display name',
                    }[name]
                  }
                  type={name === 'from_email' ? 'email' : 'text'}
                  required={name !== 'from_name'}
                  error={Boolean(errors[name])}
                  helperText={errors[name]?.message}
                  disabled={mutation.isPending}
                />
              )}
            />
          ))}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="port"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Port"
                  type="number"
                  required
                  error={Boolean(errors.port)}
                  helperText={errors.port?.message}
                  disabled={mutation.isPending}
                  sx={{ flex: 1 }}
                />
              )}
            />
            <Controller
              name="security"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Connection security"
                  select
                  required
                  disabled={mutation.isPending}
                  sx={{ flex: 2 }}
                >
                  <MenuItem value="starttls">STARTTLS</MenuItem>
                  <MenuItem value="ssl">SSL/TLS</MenuItem>
                </TextField>
              )}
            />
          </Stack>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={account ? 'New SMTP password' : 'SMTP password'}
                type="password"
                required={!account}
                autoComplete="new-password"
                error={Boolean(errors.password)}
                helperText={
                  errors.password?.message ??
                  (account ? 'Leave blank to keep the current password.' : undefined)
                }
                disabled={mutation.isPending}
              />
            )}
          />
          {saved && <Alert severity="success">Email connection saved.</Alert>}
          {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending || (account ? !isDirty : false)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {mutation.isPending ? 'Saving…' : 'Save connection'}
          </Button>
        </Stack>

        {account && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="subtitle2">Test delivery</Typography>
            <Typography color="text.secondary">
              Send a real message to confirm that the SMTP server accepts mail.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Test recipient"
                type="email"
                value={testRecipient}
                onChange={(event) => {
                  setTestRecipient(event.target.value)
                  setRecipientError('')
                }}
                error={Boolean(recipientError)}
                helperText={recipientError}
                disabled={testAccount.isPending}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={() => void sendTest()}
                disabled={testAccount.isPending}
              >
                {testAccount.isPending ? 'Sending…' : 'Send test email'}
              </Button>
            </Stack>
            {testAccount.isSuccess && (
              <Alert severity="success">
                Test email accepted by the SMTP server. Check the recipient inbox.
              </Alert>
            )}
            {testAccount.isError && <Alert severity="error">{testAccount.error.message}</Alert>}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}

export function SettingsPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' })
  const { settings, accounts } = useOrganizationSettings(organizationId)
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
  const account = accounts.data.find((item) => item.is_default) ?? accounts.data[0]
  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <Box>
        <Typography variant="h4">Workspace settings</Typography>
        <Typography color="text.secondary">
          Manage this workspace's regional preferences and invitation delivery.
        </Typography>
      </Box>
      <EmailSettings key={account?.id ?? 'new'} organizationId={organizationId} account={account} />
    </Stack>
  )
}
