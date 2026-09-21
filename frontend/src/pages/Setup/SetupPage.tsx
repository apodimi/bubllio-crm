import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import { BrandLogo } from '../../components/common/BrandLogo'
import { useCompleteSetup, useTestSmtpConnection } from '../../features/setup/hooks/useSetup'
import type { SetupValues, SmtpSettings } from '../../features/setup/services/setupService'

const steps = ['Admin', 'Workspace', 'Email', 'Review']
const descriptions = [
  'Secure your installation with its first administrator.',
  'Give your team a place to work together.',
  'Connect email now, or leave it for later.',
  'Check everything before creating your workspace.',
]

type Details = Omit<SetupValues, 'smtp'>

const initialDetails: Details = {
  setup_token: '', username: '', email: '', password: '',
  organization_name: '', organization_slug: '',
}

const initialSmtp: SmtpSettings = {
  name: 'Primary', host: '', port: 587, username: '', password: '',
  from_email: '', use_tls: true, use_ssl: false, is_default: true,
}

export function SetupPage({ onComplete }: { onComplete: () => void }) {
  const setup = useCompleteSetup()
  const emailTest = useTestSmtpConnection()
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<Details>(initialDetails)
  const [smtp, setSmtp] = useState<SmtpSettings>(initialSmtp)
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [recipient, setRecipient] = useState('')

  function setDetail<K extends keyof Details>(key: K, value: Details[K]) {
    setDetails(current => ({ ...current, [key]: value }))
    if (key === 'setup_token') emailTest.reset()
  }

  function setSmtpValue<K extends keyof SmtpSettings>(key: K, value: SmtpSettings[K]) {
    setSmtp(current => ({ ...current, [key]: value }))
    emailTest.reset()
  }

  function setSecurityMode(ssl: boolean) {
    setSmtp(current => ({ ...current, use_ssl: ssl, use_tls: !ssl, port: ssl ? 465 : 587 }))
    emailTest.reset()
  }

  async function testEmail() {
    try {
      await emailTest.mutateAsync({ setup_token: details.setup_token, smtp, recipient })
    } catch {
      // The request error is displayed beside the test button.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < steps.length - 1) {
      setStep(current => current + 1)
      return
    }
    try {
      await setup.mutateAsync({ ...details, ...(smtpEnabled ? { smtp } : {}) })
      onComplete()
    } catch {
      // Keep the entered values and show the server validation error below.
    }
  }

  return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 }, display: 'grid', placeItems: 'center' }}>
    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 1080, minHeight: { md: 700 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.86fr 1.14fr' }, overflow: 'hidden' }}>
      <Stack sx={theme => ({ display: { xs: 'none', md: 'flex' }, justifyContent: 'space-between', p: 5, color: 'primary.contrastText', background: `linear-gradient(145deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` })}>
        <BrandLogo inverse product="CRM" />
        <Box>
          <Chip label="FIRST-RUN SETUP" sx={theme => ({ mb: 3, bgcolor: alpha(theme.palette.primary.contrastText, 0.14), color: 'primary.contrastText', letterSpacing: '.08em' })} />
          <Typography variant="h3" sx={{ mb: 2 }}>Your workspace starts here.</Typography>
          <Typography sx={{ opacity: 0.8, maxWidth: 340 }}>A few focused steps to make Bubllio yours. Nothing is created until you confirm the final review.</Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>Private setup · Your data stays in your installation</Typography>
      </Stack>

      <Stack sx={{ p: { xs: 3, sm: 5, md: 6 }, minWidth: 0 }}>
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4 }}><BrandLogo product="CRM" /></Box>
        <Typography variant="overline" color="primary.main">Step {step + 1} of {steps.length}</Typography>
        <Typography variant="h4" sx={{ mt: 0.5 }}>{['Create your admin', 'Name your workspace', 'Email settings', 'Ready to begin?'][step]}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{descriptions[step]}</Typography>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4, mx: { xs: -1, sm: 0 }, '& .MuiStepLabel-label': { fontSize: { xs: 11, sm: 13 } } }}>
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        <Stack component="form" onSubmit={submit} spacing={2.5} sx={{ flex: 1 }}>
          {setup.error && <Alert severity="error">{setup.error.message}</Alert>}
          {step === 0 && <>
            <Alert severity="info">Set a random BUBLLIO_SETUP_TOKEN on the backend, then enter it here. It stays in memory only and is never persisted by the browser.</Alert>
            <TextField label="Setup token" type="password" autoComplete="off" value={details.setup_token} onChange={event => setDetail('setup_token', event.target.value)} required fullWidth />
            <TextField label="Username" autoComplete="username" value={details.username} onChange={event => setDetail('username', event.target.value)} required fullWidth />
            <TextField label="Email" type="email" autoComplete="email" value={details.email} onChange={event => setDetail('email', event.target.value)} required fullWidth />
            <TextField label="Password" type="password" autoComplete="new-password" value={details.password} onChange={event => setDetail('password', event.target.value)} required fullWidth helperText="Django password rules apply." />
          </>}

          {step === 1 && <>
            <TextField label="Workspace name" value={details.organization_name} onChange={event => setDetail('organization_name', event.target.value)} required fullWidth />
            <TextField label="Workspace slug" value={details.organization_slug} onChange={event => setDetail('organization_slug', event.target.value)} required fullWidth helperText="Lowercase letters, numbers and hyphens. Used in workspace URLs." />
            <Alert severity="info">Your new admin will also be the owner of this workspace.</Alert>
          </>}

          {step === 2 && <>
            <FormControlLabel control={<Checkbox checked={smtpEnabled} onChange={event => { setSmtpEnabled(event.target.checked); emailTest.reset() }} />} label="Configure SMTP now" />
            {!smtpEnabled && <Alert severity="info">You can skip this step and add an email account later through the API or Django admin.</Alert>}
            {smtpEnabled && <>
              <Alert severity="info">Set BUBLLIO_EMAIL_ENCRYPTION_KEY on the backend first. The test sends a real email; automation emails still use the console backend.</Alert>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Account name" value={smtp.name} onChange={event => setSmtpValue('name', event.target.value)} required fullWidth />
                <TextField label="From email" type="email" value={smtp.from_email} onChange={event => setSmtpValue('from_email', event.target.value)} required fullWidth />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="SMTP host" value={smtp.host} onChange={event => setSmtpValue('host', event.target.value)} required fullWidth />
                <TextField label="SMTP port" type="number" value={smtp.port} onChange={event => setSmtpValue('port', Number(event.target.value))} slotProps={{ htmlInput: { min: 1, max: 65535 } }} required sx={{ width: { xs: '100%', sm: 150 } }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="SMTP username" value={smtp.username} onChange={event => setSmtpValue('username', event.target.value)} required fullWidth />
                <TextField label="SMTP password" type="password" autoComplete="new-password" value={smtp.password} onChange={event => setSmtpValue('password', event.target.value)} required fullWidth />
              </Stack>
              <FormControlLabel control={<Checkbox checked={smtp.use_ssl} onChange={event => setSecurityMode(event.target.checked)} />} label="Use SSL (port 465) instead of STARTTLS (port 587)" />
              <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Send a test email</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>This sends a real message using the details above. Check the recipient inbox before continuing.</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField label="Recipient email" type="email" value={recipient} onChange={event => { setRecipient(event.target.value); emailTest.reset() }} fullWidth />
                  <Button type="button" variant="outlined" startIcon={<SendRounded />} disabled={emailTest.isPending || !recipient || !details.setup_token || !smtp.host || !smtp.username || !smtp.password || !smtp.from_email} onClick={event => { if (event.currentTarget.form?.reportValidity()) void testEmail() }} sx={{ whiteSpace: 'nowrap' }}>{emailTest.isPending ? 'Sending…' : 'Send test email'}</Button>
                </Stack>
                {emailTest.isSuccess && <Alert severity="success" sx={{ mt: 2 }}>{emailTest.data.detail}</Alert>}
                {emailTest.isError && <Alert severity="error" sx={{ mt: 2 }}>Could not send the test email. Check the SMTP details and recipient, then try again.</Alert>}
              </Paper>
            </>}
          </>}

          {step === 3 && <>
            <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default' }}>
              <Stack spacing={2}>
                <ReviewItem label="Administrator" value={`${details.username} · ${details.email}`} />
                <ReviewItem label="Workspace" value={`${details.organization_name} · ${details.organization_slug}`} />
                <ReviewItem label="Email" value={smtpEnabled ? `${smtp.name} · ${smtp.host}:${smtp.port}` : 'Not configured yet'} />
              </Stack>
            </Paper>
            {smtpEnabled && <Alert severity={emailTest.isSuccess ? 'success' : 'warning'}>{emailTest.isSuccess ? 'A test email was sent. Check the inbox to confirm delivery.' : 'No successful test email yet. You may go back to test or finish setup and troubleshoot later.'}</Alert>}
            <Typography variant="body2" color="text.secondary">Completing setup creates your admin account and workspace. You will sign in afterward.</Typography>
          </>}

          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', pt: 2 }}>
            <Button type="button" startIcon={<ArrowBackRounded />} disabled={step === 0 || setup.isPending} onClick={() => setStep(current => current - 1)}>Back</Button>
            <Stack direction="row" spacing={1}>
              {step === 2 && !smtpEnabled && <Button type="button" onClick={() => setStep(3)}>Skip for now</Button>}
              <Button type="submit" variant="contained" endIcon={step === 3 ? <CheckCircleRounded /> : <ArrowForwardRounded />} disabled={setup.isPending}>{step === 3 ? (setup.isPending ? 'Creating…' : 'Complete setup') : 'Continue'}</Button>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  </Box>
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 0.5 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
  </Stack>
}
