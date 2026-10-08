import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate, useParams } from '@tanstack/react-router'
import { authService } from '../../features/auth/services/authService'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const params = useParams({ strict: false }) as { uid?: string; token?: string }
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!params.uid || !params.token) {
      setPending(true)
      try {
        await authService.requestPasswordReset(email)
        setMessage(t('passwordReset.requestSuccess'))
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : t('passwordReset.requestFailed'))
      } finally {
        setPending(false)
      }
      return
    }
    if (password !== confirmation) {
      setError(t('passwordReset.mismatch'))
      return
    }
    setPending(true)
    try {
      await authService.confirmPasswordReset(params.uid, params.token, password)
      setMessage(t('passwordReset.resetSuccess'))
      setTimeout(() => void navigate({ to: '/' }), 800)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('passwordReset.resetFailed'))
    } finally {
      setPending(false)
    }
  }

  const hasToken = Boolean(params.uid && params.token)
  return (
    <Stack sx={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', p: 3 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, maxWidth: 460, width: '100%' }}>
        <Stack component="form" onSubmit={submit} spacing={2.5}>
          <LanguageSwitcher />
          <Typography variant="h4">
            {hasToken ? t('passwordReset.newTitle') : t('passwordReset.requestTitle')}
          </Typography>
          <Typography color="text.secondary">
            {hasToken ? t('passwordReset.newDescription') : t('passwordReset.requestDescription')}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {!hasToken ? (
            <TextField
              label={t('passwordReset.email')}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          ) : (
            <>
              <TextField
                label={t('passwordReset.newPassword')}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
              <TextField
                label={t('passwordReset.confirmPassword')}
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </>
          )}
          <Button type="submit" variant="contained" disabled={pending}>
            {pending
              ? t('passwordReset.submitting')
              : hasToken
                ? t('passwordReset.reset')
                : t('passwordReset.sendLink')}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
