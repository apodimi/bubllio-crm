import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Loading } from '../../components/common/Feedback'
import { useAuth } from '../../features/auth'
import { authService } from '../../features/auth/services/authService'
import { OrganizationsPage } from '../Organizations/OrganizationsPage'

export function SuiteHomePage() {
  const { organization_id: organizationId } = useSearch({ from: '/' })

  if (!organizationId) return <OrganizationsPage />

  return <SuiteLaunch organizationId={organizationId} />
}

function SuiteLaunch({ organizationId }: { organizationId: string }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const validId = z.string().uuid().safeParse(organizationId).success
  const resolution = useQuery({
    queryKey: ['auth', 'suite', 'resolve', organizationId],
    queryFn: ({ signal }) => authService.resolveSuiteOrganization(organizationId, signal),
    enabled: validId && auth.mode === 'suite' && Boolean(auth.username),
    retry: false,
  })

  useEffect(() => {
    if (!resolution.data) return

    void navigate({
      to: '/organizations/$organizationId',
      params: { organizationId: resolution.data.organization_id },
      search: {},
      replace: true,
    })
  }, [navigate, resolution.data])

  if (!validId) return <LaunchMessage message={t('auth.suiteInvalidOrganization')} />
  if (!auth.suiteAvailable) return <LaunchMessage message={t('auth.suiteUnavailable')} />
  if (auth.mode !== 'suite') {
    return (
      <Stack spacing={2} sx={{ maxWidth: 520, mx: 'auto', mt: 8 }}>
        <Typography variant="h4">{t('auth.suiteSignInTitle')}</Typography>
        <Button variant="contained" onClick={() => void auth.signInToSuite()}>
          {t('auth.suiteSignIn')}
        </Button>
      </Stack>
    )
  }
  if (resolution.isPending) return <Loading />
  if (resolution.isError) {
    const message =
      resolution.error instanceof Error &&
      'status' in resolution.error &&
      resolution.error.status === 404
        ? t('auth.suiteNoAccess')
        : t('auth.suiteUnavailable')

    return (
      <Stack spacing={2} sx={{ maxWidth: 520, mx: 'auto', mt: 8 }}>
        <Alert severity="error">{message}</Alert>
        <Button onClick={() => void resolution.refetch()}>{t('common.retry')}</Button>
      </Stack>
    )
  }

  return <Loading />
}

function LaunchMessage({ message }: { message: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 8 }}>
      <Alert severity="error">{message}</Alert>
      <Button onClick={() => void navigate({ to: '/', search: {} })} sx={{ mt: 2 }}>
        {t('auth.suiteBackToCrm')}
      </Button>
    </Box>
  )
}
