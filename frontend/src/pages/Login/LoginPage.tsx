import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link, useNavigate } from '@tanstack/react-router'
import { BrandLogo } from '../../components/common/BrandLogo'
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher'
import { useAuth } from '../../features/auth'
import { useTranslation } from 'react-i18next'

export function LoginPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: SubmitEvent<HTMLFormElement>) {
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
      setError(reason instanceof Error ? reason.message : t('auth.signInFailed'))
    } finally {
      setPending(false)
    }
  }
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, .82fr) minmax(480px, 1.18fr)' },
        bgcolor: 'background.default',
      }}
    >
      <Stack
        sx={{
          justifyContent: 'space-between',
          bgcolor: 'primary.light',
          color: 'text.primary',
          p: { xs: 3, sm: 4, md: 7 },
          borderRight: { md: 1 },
          borderColor: { md: 'divider' },
        }}
      >
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <BrandLogo product="CRM" />
          <LanguageSwitcher />
        </Stack>
        <Box sx={{ py: { xs: 5, md: 8 } }}>
          <Typography variant="h2" sx={{ maxWidth: 480, mb: 2, textWrap: 'balance' }}>
            {t('auth.heroLineOne')}
            <br />
            {t('auth.heroLineTwo')}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
            {t('auth.heroDescription')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {t('auth.tagline')}
        </Typography>
      </Stack>
      <Stack
        component="main"
        id="main-content"
        sx={{ justifyContent: 'center', p: { xs: 2, sm: 4, md: 8 } }}
      >
        <Paper
          variant="outlined"
          sx={{ p: { xs: 3, sm: 5 }, maxWidth: 500, width: '100%', mx: 'auto' }}
        >
          <Typography variant="h3" component="h1" sx={{ mb: 1 }}>
            {t('auth.welcomeBack')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {t('auth.signInDescription')}
          </Typography>
          <Stack component="form" onSubmit={submit} spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={t('auth.username')}
              name="username"
              autoComplete="username"
              required
              autoFocus
              fullWidth
            />
            <TextField
              label={t('auth.password')}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              fullWidth
            />
            <Button variant="contained" type="submit" size="large" disabled={pending}>
              {pending ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
            <Typography
              component={Link}
              to="/reset-password"
              variant="body2"
              color="primary"
              sx={{ alignSelf: 'center', textDecoration: 'none' }}
            >
              {t('auth.forgotPassword')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            {t('auth.accessHelp')}
          </Typography>
        </Paper>
      </Stack>
    </Box>
  )
}
