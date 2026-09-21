import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material'
import SendRounded from '@mui/icons-material/SendRounded'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import type { SetupFormValues } from '../setupSchema'
import { SetupField } from './SetupField'

export function AdminStep({ resetTest }: { resetTest: () => void }) {
  return <>
    <Alert severity="info">Copy the one-time token from the server's BUBLLIO_SETUP_TOKEN setting. It stays in memory only while this page is open.</Alert>
    <SetupField name="setup_token" label="Installation setup token" type="password" autoComplete="off" helperText="The one-time token configured on your server; not your admin password." onValueChange={resetTest} />
    <SetupField name="username" label="Admin username" autoComplete="username" helperText="Use this to sign in to Bubllio and Django admin." />
    <SetupField name="email" label="Admin email address" type="email" autoComplete="email" helperText="Email address for the first administrator account." />
    <SetupField name="password" label="Admin password" type="password" autoComplete="new-password" helperText="Choose a strong password of at least 8 characters." />
  </>
}

export function WorkspaceStep() {
  return <>
    <SetupField name="organization_name" label="Workspace display name" helperText="The name your team will see in the app, for example Nerds Lab." />
    <SetupField name="organization_slug" label="Workspace URL slug" helperText="A short lowercase identifier, for example nerds-lab." />
    <Alert severity="info">The admin account from the previous step becomes this workspace's owner.</Alert>
  </>
}

type EmailStepProps = {
  testEmail: () => void
  resetTest: () => void
  testResult: { isPending: boolean; isSuccess: boolean; isError: boolean; data?: { detail: string } }
}

export function EmailStep({ testEmail, resetTest, testResult }: EmailStepProps) {
  const { control, setValue } = useFormContext<SetupFormValues>()
  const smtpEnabled = useWatch({ control, name: 'smtp_enabled' })

  return <>
    <Controller name="smtp_enabled" control={control} render={({ field }) =>
      <FormControlLabel control={<Checkbox checked={field.value} onChange={event => { field.onChange(event.target.checked); resetTest() }} />} label="Configure an SMTP account now" />
    } />
    {!smtpEnabled && <Alert severity="info">This step is optional. You can add an email account later from Django admin or the organization API.</Alert>}
    {smtpEnabled && <>
      <Alert severity="info">Set BUBLLIO_EMAIL_ENCRYPTION_KEY on the server before finishing setup. The test below sends a real email; automation emails still use the console backend.</Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
        <SetupField name="smtp_name" label="Email account label" helperText="A name for this SMTP account, for example Primary." onValueChange={resetTest} />
        <SetupField name="smtp_from_email" label="Sender email address (From)" type="email" helperText="The address recipients will see as the sender." onValueChange={resetTest} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
        <SetupField name="smtp_host" label="SMTP server hostname" helperText="Provided by your email service, for example smtp.example.com." onValueChange={resetTest} />
        <Box sx={{ width: { xs: '100%', sm: 160 }, flexShrink: 0 }}>
          <SetupField name="smtp_port" label="SMTP server port" type="number" helperText="Usually 587 or 465." onValueChange={resetTest} />
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
        <SetupField name="smtp_username" label="SMTP login username" helperText="The username supplied by your email provider." onValueChange={resetTest} />
        <SetupField name="smtp_password" label="SMTP login password" type="password" autoComplete="new-password" helperText="Often an app password, not your personal email password." onValueChange={resetTest} />
      </Stack>
      <Controller name="smtp_use_ssl" control={control} render={({ field }) =>
        <FormControlLabel control={<Checkbox checked={field.value} onChange={event => {
          const useSsl = event.target.checked
          field.onChange(useSsl)
          setValue('smtp_port', useSsl ? '465' : '587', { shouldValidate: true })
          resetTest()
        }} />} label="Use SSL on port 465 (unchecked: STARTTLS on port 587)" />
      } />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'background.default', minWidth: 0 }}>
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2">Send a test email</Typography>
          <Typography variant="body2" color="text.secondary">We'll send one message using the SMTP details above. Nothing is saved until you finish setup.</Typography>
          <SetupField name="smtp_recipient" label="Test recipient email address" type="email" helperText="Use an inbox you can check now to confirm delivery." onValueChange={resetTest} />
          <Button type="button" variant="outlined" startIcon={<SendRounded />} disabled={testResult.isPending} onClick={testEmail} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, maxWidth: '100%', minWidth: 0, whiteSpace: 'normal' }}>
            {testResult.isPending ? 'Sending test email…' : 'Send test email'}
          </Button>
          {testResult.isSuccess && testResult.data && <Alert severity="success">{testResult.data.detail}</Alert>}
          {testResult.isError && <Alert severity="error">Could not send the test email. Check the SMTP settings and recipient, then try again.</Alert>}
        </Stack>
      </Paper>
    </>}
  </>
}

export function ReviewStep({ values, testSent }: { values: SetupFormValues; testSent: boolean }) {
  return <>
    <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default' }}>
      <Stack spacing={2}>
        <ReviewItem label="Administrator" value={`${values.username} · ${values.email}`} />
        <ReviewItem label="Workspace" value={`${values.organization_name} · ${values.organization_slug}`} />
        <ReviewItem label="Email" value={values.smtp_enabled ? `${values.smtp_name} · ${values.smtp_host}:${values.smtp_port}` : 'Not configured yet'} />
      </Stack>
    </Paper>
    {values.smtp_enabled && <Alert severity={testSent ? 'success' : 'warning'}>{testSent ? 'The SMTP server accepted a test email. Check the recipient inbox to confirm delivery.' : 'No successful test email yet. You can go back to test it or finish setup and troubleshoot later.'}</Alert>}
    <Typography variant="body2" color="text.secondary">Completing setup creates the admin account and workspace. You will sign in afterward.</Typography>
  </>
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 0.5 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
  </Stack>
}
