import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Link, useNavigate } from '@tanstack/react-router'
import { BrandLogo } from '../../components/common/BrandLogo'
import { useAuth } from '../../features/auth'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setPending(true)
    setError('')
    try {
      await auth.login(String(values.get('username')), String(values.get('password')))
      form.reset()
      await navigate({ to: '/', replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in.')
    } finally {
      setPending(false)
    }
  }
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      <Stack
        sx={{
          justifyContent: 'space-between',
          bgcolor: 'primary.dark',
          color: 'primary.contrastText',
          p: { xs: 4, md: 8 },
        }}
      >
        <BrandLogo inverse product="CRM" />
        <Box sx={{ py: 6 }}>
          <Chip
            label="A little less busywork."
            sx={(theme) => ({
              bgcolor: alpha(theme.palette.primary.contrastText, 0.08),
              color: 'primary.light',
              mb: 3,
            })}
          />
          <Typography variant="h3" sx={{ maxWidth: 480, mb: 3 }}>
            Good relationships.
            <br />
            Room to grow.
          </Typography>
          <Typography sx={{ color: 'primary.light', maxWidth: 380, opacity: 0.82 }}>
            Your companies, your people, and your next opportunity. Together in one workspace.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.6 }}>
          Bubllio CRM · Built to be yours
        </Typography>
      </Stack>
      <Stack sx={{ justifyContent: 'center', p: { xs: 3, md: 8 } }}>
        <Paper
          variant="outlined"
          sx={{ p: { xs: 3, sm: 5 }, maxWidth: 480, width: '100%', mx: 'auto' }}
        >
          <Typography variant="h4" sx={{ mb: 1 }}>
            Welcome back.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Sign in to your workspace.
          </Typography>
          <Stack component="form" onSubmit={submit} spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Username"
              name="username"
              autoComplete="username"
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              fullWidth
            />
            <Button variant="contained" type="submit" size="large" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
            <Typography
              component={Link}
              to="/reset-password"
              variant="body2"
              color="primary"
              sx={{ alignSelf: 'center', textDecoration: 'none' }}
            >
              Forgot password?
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Use your existing Bubllio account. Need access? Contact your workspace owner.
          </Typography>
        </Paper>
      </Stack>
    </Box>
  )
}
