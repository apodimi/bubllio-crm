import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { BrandLogo } from '../../components/common/BrandLogo'
import { Failure, Loading } from '../../components/common/Feedback'
import { useAuth } from '../../features/auth'
import { useAuthStore } from '../../features/auth/store/authStore'
import { authService } from '../../features/auth/services/authService'
import {
  useAcceptInvitation,
  useInvitationPreview,
} from '../../features/invitations/hooks/useInvitations'
import { queryClient } from '../../config/queryClient'

const registrationSchema = z.object({
  username: z.string().trim().min(1, 'Choose a username.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  display_name: z.string().trim().min(1, 'Enter the name your teammates should see.'),
  first_name: z.string().trim(),
  last_name: z.string().trim(),
  date_of_birth: z.string(),
})
type RegistrationForm = z.infer<typeof registrationSchema>

export function InvitePage({ installationAdmin = false }: { installationAdmin?: boolean }) {
  const params = useParams({ strict: false })
  const token = 'token' in params ? String(params.token) : ''
  const preview = useInvitationPreview(token, installationAdmin)
  const accept = useAcceptInvitation(installationAdmin)
  const auth = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'register' | 'sign-in'>('register')
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const registration = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: '',
      password: '',
      display_name: '',
      first_name: '',
      last_name: '',
      date_of_birth: '',
    },
  })

  if (preview.isPending) return <Loading />
  if (preview.isError) return <Failure error={preview.error} retry={() => void preview.refetch()} />

  async function finish(input?: RegistrationForm) {
    try {
      const registrationInput = input
        ? { ...input, date_of_birth: input.date_of_birth || null }
        : undefined
      const result = await accept.mutateAsync({ token, input: registrationInput })
      if (result.tokens) {
        useAuthStore.setState({
          accessToken: result.tokens.access,
          refreshToken: result.tokens.refresh,
        })
        try {
          const user = await authService.currentUser()
          useAuthStore.getState().setSession(result.tokens, user)
        } catch (error) {
          useAuthStore.getState().clearSession()
          throw error
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['organizations'] })
      if (installationAdmin) {
        const user = await authService.currentUser()
        useAuthStore.setState({ user })
        await navigate({ to: '/', replace: true })
      } else if (result.organization_id) {
        await navigate({
          to: '/organizations/$organizationId',
          params: { organizationId: result.organization_id },
          replace: true,
        })
      }
    } catch {
      /* The mutation error is shown below. */
    }
  }

  async function signIn() {
    setLoginError('')
    try {
      await auth.login(username, password)
      await finish()
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not sign in.')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 2,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 520, p: { xs: 3, sm: 5 } }}>
        <Stack spacing={2.5}>
          <BrandLogo product="CRM" />
          <Typography variant="h4">
            {installationAdmin
              ? 'Become an installation administrator'
              : `Join ${preview.data.organization_name}`}
          </Typography>
          <Typography color="text.secondary">
            {installationAdmin
              ? `You were invited to manage this Bubllio installation using ${preview.data.email}. Installation administration does not add you to any workspace.`
              : `You've been invited as ${preview.data.role} using ${preview.data.email}. This role applies only to this workspace.`}
          </Typography>
          {accept.isError && <Alert severity="error">{accept.error.message}</Alert>}
          {auth.username ? (
            <>
              <Typography>
                Signed in as {auth.username}. Use the account with email {preview.data.email} to
                accept.
              </Typography>
              <Button variant="contained" disabled={accept.isPending} onClick={() => void finish()}>
                Accept invitation
              </Button>
              <Button variant="text" onClick={() => void auth.logout()}>
                Use another account
              </Button>
            </>
          ) : (
            <>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={mode === 'register' ? 'contained' : 'text'}
                  onClick={() => setMode('register')}
                >
                  Create account
                </Button>
                <Button
                  variant={mode === 'sign-in' ? 'contained' : 'text'}
                  onClick={() => setMode('sign-in')}
                >
                  I have an account
                </Button>
              </Stack>
              {mode === 'register' ? (
                <Stack
                  key="register"
                  component="form"
                  noValidate
                  onSubmit={registration.handleSubmit((values) => void finish(values))}
                  spacing={2}
                >
                  <Typography variant="body2" color="text.secondary">
                    Your invited email is fixed. Add the profile details your teammates will see;
                    date of birth is optional and can be left blank.
                  </Typography>
                  <ProfileField
                    registration={registration}
                    name="display_name"
                    label="Display name"
                    helper="The name shown to teammates."
                  />
                  <ProfileField registration={registration} name="first_name" label="First name" />
                  <ProfileField registration={registration} name="last_name" label="Last name" />
                  <ProfileField
                    registration={registration}
                    name="date_of_birth"
                    label="Date of birth (optional)"
                    type="date"
                  />
                  <Box>
                    <Typography component="label" htmlFor="invite-username" variant="body2">
                      Username
                    </Typography>
                    <TextField
                      id="invite-username"
                      fullWidth
                      autoComplete="username"
                      {...registration.register('username')}
                      error={!!registration.formState.errors.username}
                      helperText={registration.formState.errors.username?.message}
                    />
                  </Box>
                  <Box>
                    <Typography component="label" htmlFor="invite-password" variant="body2">
                      Password
                    </Typography>
                    <TextField
                      id="invite-password"
                      fullWidth
                      type="password"
                      autoComplete="new-password"
                      {...registration.register('password')}
                      error={!!registration.formState.errors.password}
                      helperText={registration.formState.errors.password?.message}
                    />
                  </Box>
                  <Button variant="contained" type="submit" disabled={accept.isPending}>
                    {installationAdmin ? 'Create administrator account' : 'Create account and join'}
                  </Button>
                </Stack>
              ) : (
                <Stack
                  key="sign-in"
                  component="form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void signIn()
                  }}
                  spacing={2}
                >
                  {loginError && <Alert severity="error">{loginError}</Alert>}
                  <Box>
                    <Typography component="label" htmlFor="existing-username" variant="body2">
                      Username
                    </Typography>
                    <TextField
                      id="existing-username"
                      fullWidth
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      required
                    />
                  </Box>
                  <Box>
                    <Typography component="label" htmlFor="existing-password" variant="body2">
                      Password
                    </Typography>
                    <TextField
                      id="existing-password"
                      fullWidth
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </Box>
                  <Button variant="contained" type="submit" disabled={accept.isPending}>
                    {installationAdmin ? 'Sign in and accept' : 'Sign in and join'}
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}

export function InstallationAdminInvitePage() {
  return <InvitePage installationAdmin />
}

function ProfileField({
  registration,
  name,
  label,
  helper,
  type = 'text',
}: {
  registration: ReturnType<typeof useForm<RegistrationForm>>
  name: 'display_name' | 'first_name' | 'last_name' | 'date_of_birth'
  label: string
  helper?: string
  type?: string
}) {
  const error = registration.formState.errors[name]?.message
  return (
    <Box>
      <Typography component="label" htmlFor={`invite-${name}`} variant="body2">
        {label}
      </Typography>
      <TextField
        id={`invite-${name}`}
        fullWidth
        type={type}
        slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}
        {...registration.register(name)}
        error={!!error}
        helperText={error ?? helper}
      />
    </Box>
  )
}
