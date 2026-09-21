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
})
type RegistrationForm = z.infer<typeof registrationSchema>

export function InvitePage() {
  const { token } = useParams({ from: '/invite/$token' })
  const preview = useInvitationPreview(token)
  const accept = useAcceptInvitation()
  const auth = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'register' | 'sign-in'>('register')
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const registration = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { username: '', password: '' },
  })

  if (preview.isPending) return <Loading />
  if (preview.isError) return <Failure error={preview.error} retry={() => void preview.refetch()} />

  async function finish(input: RegistrationForm | Record<string, never>) {
    try {
      const result = await accept.mutateAsync({ token, input })
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
      await navigate({
        to: '/organizations/$organizationId',
        params: { organizationId: result.organization_id },
        replace: true,
      })
    } catch {
      /* The mutation error is shown below. */
    }
  }

  async function signIn() {
    setLoginError('')
    try {
      await auth.login(username, password)
      await finish({})
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
          <Typography variant="h4">Join {preview.data.organization_name}</Typography>
          <Typography color="text.secondary">
            You've been invited as <strong>{preview.data.role}</strong> using {preview.data.email}.
            This role applies only to this workspace.
          </Typography>
          {accept.isError && <Alert severity="error">{accept.error.message}</Alert>}
          {auth.username ? (
            <>
              <Typography>
                Signed in as {auth.username}. Use the account with email {preview.data.email} to
                accept.
              </Typography>
              <Button
                variant="contained"
                disabled={accept.isPending}
                onClick={() => void finish({})}
              >
                Accept invitation
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
                    Your email is fixed by the invitation. You can create your own workspaces after
                    joining.
                  </Typography>
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
                    Create account and join
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
                    Sign in and join
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
