import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate, useParams } from '@tanstack/react-router'
import { authService } from '../../features/auth/services/authService'

export function ResetPasswordPage() {
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
        setMessage('If an account exists for that email, reset instructions have been sent.')
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not request a password reset.')
      } finally {
        setPending(false)
      }
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    setPending(true)
    try {
      await authService.confirmPasswordReset(params.uid, params.token, password)
      setMessage('Password reset successfully. You can now sign in.')
      setTimeout(() => void navigate({ to: '/' }), 800)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reset the password.')
    } finally {
      setPending(false)
    }
  }

  const hasToken = Boolean(params.uid && params.token)
  return (
    <Stack sx={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', p: 3 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, maxWidth: 460, width: '100%' }}>
        <Stack component="form" onSubmit={submit} spacing={2.5}>
          <Typography variant="h4">
            {hasToken ? 'Choose a new password' : 'Reset your password'}
          </Typography>
          <Typography color="text.secondary">
            {hasToken
              ? 'Use a strong password you have not used before.'
              : 'Enter your account email and we will send reset instructions.'}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {!hasToken ? (
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          ) : (
            <>
              <TextField
                label="New password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
              <TextField
                label="Confirm password"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </>
          )}
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Submitting…' : hasToken ? 'Reset password' : 'Send reset link'}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
