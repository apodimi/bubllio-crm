import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material'
import { BrandLogo } from '../../components/common/BrandLogo'
import { useCompleteSetup } from '../../features/setup/hooks/useSetup'
import type { SetupValues } from '../../features/setup/services/setupService'

export function SetupPage({ onComplete }: { onComplete: () => void }) {
  const setup = useCompleteSetup()
  const [withSmtp, setWithSmtp] = useState(false)
  const [useSsl, setUseSsl] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = (name: string) => String(data.get(name) ?? '')
    const values: SetupValues = {
      setup_token: value('setup_token'),
      username: value('username'),
      email: value('email'),
      password: value('password'),
      organization_name: value('organization_name'),
      organization_slug: value('organization_slug'),
    }
    if (withSmtp) values.smtp = {
      name: value('smtp_name'),
      host: value('smtp_host'),
      port: Number(value('smtp_port')),
      username: value('smtp_username'),
      password: value('smtp_password'),
      from_email: value('smtp_from_email'),
      use_tls: !useSsl,
      use_ssl: useSsl,
      is_default: true,
    }
    try {
      await setup.mutateAsync(values)
      onComplete()
    } catch {
      // The mutation error is rendered below; form values remain available.
    }
  }

  return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: 2, py: { xs: 3, md: 7 } }}>
    <Paper variant="outlined" sx={{ maxWidth: 680, mx: 'auto', p: { xs: 3, md: 5 } }}>
      <BrandLogo product="CRM" />
      <Typography variant="h4" sx={{ mt: 4, mb: 1 }}>Set up your workspace</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Create the first Django admin and workspace. This page is available only before the first account is created.</Typography>
      <Stack component="form" onSubmit={submit} spacing={2.5}>
        {setup.error && <Alert severity="error">{setup.error.message}</Alert>}
        <TextField label="Setup token" name="setup_token" type="password" autoComplete="off" required fullWidth helperText="Set BUBLLIO_SETUP_TOKEN on the server, then paste it here." />
        <Typography variant="h6">Admin account</Typography>
        <TextField label="Username" name="username" autoComplete="username" required fullWidth />
        <TextField label="Email" name="email" type="email" autoComplete="email" required fullWidth />
        <TextField label="Password" name="password" type="password" autoComplete="new-password" required fullWidth helperText="Django password rules apply." />
        <Typography variant="h6">First workspace</Typography>
        <TextField label="Workspace name" name="organization_name" required fullWidth />
        <TextField label="Workspace slug" name="organization_slug" required fullWidth helperText="Lowercase letters, numbers and hyphens; used in workspace URLs." />
        <FormControlLabel control={<Checkbox checked={withSmtp} onChange={event => setWithSmtp(event.target.checked)} />} label="Configure an SMTP account now (optional)" />
        {withSmtp && <Stack spacing={2.5}>
          <Alert severity="info">Set BUBLLIO_EMAIL_ENCRYPTION_KEY on the server first. This account supports test emails; automation emails still use the global console backend.</Alert>
          <TextField label="Account name" name="smtp_name" required fullWidth />
          <TextField label="SMTP host" name="smtp_host" required fullWidth />
          <TextField label="SMTP port" name="smtp_port" type="number" defaultValue={587} required fullWidth />
          <TextField label="SMTP username" name="smtp_username" required fullWidth />
          <TextField label="SMTP password" name="smtp_password" type="password" autoComplete="new-password" required fullWidth />
          <TextField label="From email" name="smtp_from_email" type="email" required fullWidth />
          <FormControlLabel control={<Checkbox checked={useSsl} onChange={event => setUseSsl(event.target.checked)} />} label="Use SSL instead of STARTTLS" />
        </Stack>}
        <Button type="submit" variant="contained" size="large" disabled={setup.isPending}>{setup.isPending ? 'Setting up…' : 'Complete setup'}</Button>
      </Stack>
    </Paper>
  </Box>
}
