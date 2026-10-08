import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import SendRounded from '@mui/icons-material/SendRounded'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import type { SetupFormValues } from '../setupSchema'
import { SetupField } from './SetupField'
import { useTranslation } from 'react-i18next'

export function AdminStep({ resetTest }: { resetTest: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <Alert severity="info">{t('setup.tokenNotice')}</Alert>
      <SetupField
        name="setup_token"
        label={t('setup.setupToken')}
        type="password"
        autoComplete="off"
        helperText={t('setup.setupTokenHelp')}
        onValueChange={resetTest}
      />
      <SetupField
        name="username"
        label={t('setup.adminUsername')}
        autoComplete="username"
        helperText={t('setup.adminUsernameHelp')}
      />
      <SetupField
        name="email"
        label={t('setup.adminEmail')}
        type="email"
        autoComplete="email"
        helperText={t('setup.adminEmailHelp')}
      />
      <SetupField
        name="password"
        label={t('setup.adminPassword')}
        type="password"
        autoComplete="new-password"
        helperText={t('setup.adminPasswordHelp')}
      />
    </>
  )
}

export function WorkspaceStep() {
  const { t } = useTranslation()
  return (
    <>
      <SetupField
        name="organization_name"
        label={t('setup.workspaceName')}
        helperText={t('setup.workspaceNameHelp')}
      />
      <SetupField
        name="organization_slug"
        label={t('setup.workspaceSlug')}
        helperText={t('setup.workspaceSlugHelp')}
      />
      <Alert severity="info">{t('setup.ownerNotice')}</Alert>
    </>
  )
}

type EmailStepProps = {
  testEmail: () => void
  resetTest: () => void
  testResult: {
    isPending: boolean
    isSuccess: boolean
    isError: boolean
    data?: { detail: string }
  }
}

export function EmailStep({ testEmail, resetTest, testResult }: EmailStepProps) {
  const { t } = useTranslation()
  const { control, setValue } = useFormContext<SetupFormValues>()
  const smtpEnabled = useWatch({ control, name: 'smtp_enabled' })

  return (
    <>
      <Controller
        name="smtp_enabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                checked={field.value}
                onChange={(event) => {
                  field.onChange(event.target.checked)
                  resetTest()
                }}
              />
            }
            label={t('setup.configureSmtp')}
          />
        )}
      />
      {!smtpEnabled && <Alert severity="info">{t('setup.smtpOptional')}</Alert>}
      {smtpEnabled && (
        <>
          <Alert severity="info">{t('setup.encryptionNotice')}</Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
            <SetupField
              name="smtp_name"
              label={t('setup.accountLabel')}
              helperText={t('setup.accountLabelHelp')}
              onValueChange={resetTest}
            />
            <SetupField
              name="smtp_from_email"
              label={t('setup.senderEmail')}
              type="email"
              helperText={t('setup.senderEmailHelp')}
              onValueChange={resetTest}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
            <SetupField
              name="smtp_host"
              label={t('setup.smtpHost')}
              helperText={t('setup.smtpHostHelp')}
              onValueChange={resetTest}
            />
            <Box sx={{ width: { xs: '100%', sm: 160 }, flexShrink: 0 }}>
              <SetupField
                name="smtp_port"
                label={t('setup.smtpPort')}
                type="number"
                helperText={t('setup.smtpPortHelp')}
                onValueChange={resetTest}
              />
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
            <SetupField
              name="smtp_username"
              label={t('setup.smtpUsername')}
              helperText={t('setup.smtpUsernameHelp')}
              onValueChange={resetTest}
            />
            <SetupField
              name="smtp_password"
              label={t('setup.smtpPassword')}
              type="password"
              autoComplete="new-password"
              helperText={t('setup.smtpPasswordHelp')}
              onValueChange={resetTest}
            />
          </Stack>
          <Controller
            name="smtp_use_ssl"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={(event) => {
                      const useSsl = event.target.checked
                      field.onChange(useSsl)
                      setValue('smtp_port', useSsl ? '465' : '587', { shouldValidate: true })
                      resetTest()
                    }}
                  />
                }
                label={t('setup.ssl')}
              />
            )}
          />
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'background.default', minWidth: 0 }}
          >
            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2">{t('setup.testTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('setup.testDescription')}
              </Typography>
              <SetupField
                name="smtp_recipient"
                label={t('setup.testRecipient')}
                type="email"
                helperText={t('setup.testRecipientHelp')}
                onValueChange={resetTest}
              />
              <Button
                type="button"
                variant="outlined"
                startIcon={<SendRounded />}
                disabled={testResult.isPending}
                onClick={testEmail}
                sx={{
                  alignSelf: { xs: 'stretch', sm: 'flex-start' },
                  maxWidth: '100%',
                  minWidth: 0,
                  whiteSpace: 'normal',
                }}
              >
                {testResult.isPending ? t('setup.sendingTest') : t('setup.sendTest')}
              </Button>
              {testResult.isSuccess && testResult.data && (
                <Alert severity="success">{testResult.data.detail}</Alert>
              )}
              {testResult.isError && <Alert severity="error">{t('setup.testFailed')}</Alert>}
            </Stack>
          </Paper>
        </>
      )}
    </>
  )
}

export function ReviewStep({ values, testSent }: { values: SetupFormValues; testSent: boolean }) {
  const { t } = useTranslation()
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default' }}>
        <Stack spacing={2}>
          <ReviewItem
            label={t('setup.administrator')}
            value={`${values.username} · ${values.email}`}
          />
          <ReviewItem
            label={t('common.workspace')}
            value={`${values.organization_name} · ${values.organization_slug}`}
          />
          <ReviewItem
            label={t('setup.email')}
            value={
              values.smtp_enabled
                ? `${values.smtp_name} · ${values.smtp_host}:${values.smtp_port}`
                : t('setup.notConfigured')
            }
          />
        </Stack>
      </Paper>
      {values.smtp_enabled && (
        <Alert severity={testSent ? 'success' : 'warning'}>
          {testSent ? t('setup.testAccepted') : t('setup.testMissing')}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('setup.completionNotice')}
      </Typography>
    </>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ justifyContent: 'space-between', gap: 0.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Stack>
  )
}
