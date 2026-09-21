import { useState } from 'react'
import type { FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { Alert, Box, Button, Chip, Paper, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { BrandLogo } from '../../components/common/BrandLogo'
import { AdminStep, EmailStep, ReviewStep, WorkspaceStep } from '../../features/setup/components/SetupSteps'
import { useCompleteSetup, useTestSmtpConnection } from '../../features/setup/hooks/useSetup'
import { setupDefaults, setupSchema, testRecipientSchema } from '../../features/setup/setupSchema'
import type { SetupFormValues } from '../../features/setup/setupSchema'
import type { SetupValues, SmtpSettings } from '../../features/setup/services/setupService'

const steps = ['Admin', 'Workspace', 'Email', 'Review']
const titles = ['Create your admin', 'Name your workspace', 'Email settings', 'Ready to begin?']
const descriptions = [
  'Secure your installation with its first administrator.',
  'Give your team a place to work together.',
  'Connect email now, or leave it for later.',
  'Check everything before creating your workspace.',
]

const adminFields = ['setup_token', 'username', 'email', 'password'] as const
const workspaceFields = ['organization_name', 'organization_slug'] as const
const smtpFields = ['smtp_name', 'smtp_from_email', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password'] as const

function smtpPayload(values: SetupFormValues): SmtpSettings {
  return {
    name: values.smtp_name.trim(),
    from_email: values.smtp_from_email.trim(),
    host: values.smtp_host.trim(),
    port: Number(values.smtp_port),
    username: values.smtp_username.trim(),
    password: values.smtp_password,
    use_ssl: values.smtp_use_ssl,
    use_tls: !values.smtp_use_ssl,
    is_default: true,
  }
}

export function SetupPage({ onComplete }: { onComplete: () => void }) {
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: setupDefaults,
    mode: 'onTouched',
    shouldUnregister: false,
  })
  const setup = useCompleteSetup()
  const emailTest = useTestSmtpConnection()
  const [step, setStep] = useState(0)
  const smtpEnabled = form.watch('smtp_enabled')

  async function next() {
    const fields = step === 0 ? adminFields : step === 1 ? workspaceFields : smtpEnabled ? smtpFields : []
    if (fields.length && !await form.trigger(fields, { shouldFocus: true })) return
    setStep(current => current + 1)
  }

  async function sendTestEmail() {
    if (!await form.trigger(smtpFields, { shouldFocus: true })) return
    const recipient = testRecipientSchema.safeParse(form.getValues('smtp_recipient'))
    if (!recipient.success) {
      form.setError('smtp_recipient', { message: recipient.error.issues[0].message }, { shouldFocus: true })
      return
    }
    form.clearErrors('smtp_recipient')
    const values = form.getValues()
    try {
      await emailTest.mutateAsync({ setup_token: values.setup_token, smtp: smtpPayload(values), recipient: recipient.data })
    } catch {
      // The email step shows the generic request failure without leaking server details.
    }
  }

  async function complete(values: SetupFormValues) {
    const payload: SetupValues = {
      setup_token: values.setup_token,
      username: values.username,
      email: values.email,
      password: values.password,
      organization_name: values.organization_name,
      organization_slug: values.organization_slug,
      ...(values.smtp_enabled ? { smtp: smtpPayload(values) } : {}),
    }
    try {
      await setup.mutateAsync(payload)
      onComplete()
    } catch {
      // Keep the entered values so server-side validation can be corrected.
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === steps.length - 1) void form.handleSubmit(complete)(event)
    else void next()
  }

  return <FormProvider {...form}>
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 }, display: 'grid', placeItems: 'center' }}>
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
          <Typography variant="h4" sx={{ mt: 0.5 }}>{titles[step]}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{descriptions[step]}</Typography>
          <Stepper activeStep={step} alternativeLabel sx={{ mb: 4, mx: { xs: -1, sm: 0 }, '& .MuiStepLabel-label': { fontSize: { xs: 11, sm: 13 } } }}>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          <Stack component="form" noValidate onSubmit={submit} spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
            {setup.error && <Alert severity="error">{setup.error.message}</Alert>}
            {step === 0 && <AdminStep resetTest={() => emailTest.reset()} />}
            {step === 1 && <WorkspaceStep />}
            {step === 2 && <EmailStep testEmail={() => void sendTestEmail()} resetTest={() => emailTest.reset()} testResult={emailTest} />}
            {step === 3 && <ReviewStep values={form.getValues()} testSent={emailTest.isSuccess} />}
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
  </FormProvider>
}
