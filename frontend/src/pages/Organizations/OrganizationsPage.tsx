import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Box,
  Alert,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { organizationKeys, useOrganizations } from '../../features/organizations'
import { useAuthStore } from '../../features/auth/store/authStore'
import { authService } from '../../features/auth/services/authService'
import {
  pendingWorkspaceKey,
  usePendingWorkspaces,
} from '../../features/organizations/hooks/useWorkspaceProvisioning'
import { Loading, Failure, Empty, PageHeading } from '../../components/common/Feedback'
import { CreateDialog } from '../../components/common/CreateDialog'
import { useTranslation } from 'react-i18next'

export function OrganizationsPage() {
  const { t } = useTranslation()
  const query = useOrganizations()
  const canCreate = useAuthStore(
    (state) => state.user?.can_create_workspaces ?? state.user?.is_superuser ?? false,
  )
  const currentUser = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.currentUser,
    refetchOnMount: 'always',
  })
  useEffect(() => {
    if (currentUser.data) useAuthStore.setState({ user: currentUser.data })
  }, [currentUser.data])
  const pending = usePendingWorkspaces(true)
  const queryClient = useQueryClient()
  const [create, setCreate] = useState(false)
  const [cancelPendingId, setCancelPendingId] = useState<string | null>(null)
  return (
    <>
      <PageHeading
        title={t('organizations.title')}
        description={t('organizations.description')}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setCreate(true)}
              >
                {t('organizations.newShared')}
              </Button>
            )}
          </Stack>
        }
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <Empty
          title={t('organizations.emptyTitle')}
          description={t('organizations.emptyDescription')}
        />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {query.data.map((org) => (
            <Card variant="outlined" key={org.id}>
              <Link
                to="/organizations/$organizationId"
                params={{ organizationId: org.id }}
                style={{
                  display: 'block',
                  height: '100%',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                <CardActionArea component="div" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 4 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 22,
                          fontWeight: 700,
                        }}
                      >
                        {org.name.slice(0, 1).toUpperCase()}
                      </Box>
                      <Chip
                        size="small"
                        label={
                          org.is_personal
                            ? t('organizations.personal')
                            : (org.current_user_role ?? t('organizations.shared'))
                        }
                        color={org.is_personal ? 'default' : 'primary'}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="h6">{org.name}</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                      {org.slug}
                    </Typography>
                    <Stack
                      direction="row"
                      sx={{ gap: 1, alignItems: 'center', color: 'primary.main' }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t('organizations.open')}
                      </Typography>
                      <ArrowForwardRounded fontSize="small" />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Link>
            </Card>
          ))}
        </Box>
      )}
      {pending.list.isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {t('organizations.pendingLoadError', { message: pending.list.error.message })}
        </Alert>
      )}
      {pending.list.data && pending.list.data.length > 0 && (
        <Stack spacing={2} sx={{ mt: 4 }}>
          <Typography variant="h6">{t('organizations.awaitingOwners')}</Typography>
          <Typography color="text.secondary">{t('organizations.awaitingDescription')}</Typography>
          {(pending.resend.isError || pending.cancel.isError) && (
            <Alert severity="error">
              {(pending.resend.error ?? pending.cancel.error)?.message}
            </Alert>
          )}
          {pending.resend.isSuccess && (
            <Alert severity="success">{t('organizations.invitationSentAgain')}</Alert>
          )}
          {pending.list.data.map((item) => (
            <Card key={item.organization_id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('organizations.ownerInvitation', { email: item.owner_email })}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    disabled={pending.resend.isPending}
                    onClick={() => pending.resend.mutate(item.organization_id)}
                  >
                    {t('organizations.resend')}
                  </Button>
                  <Button
                    color="error"
                    disabled={pending.cancel.isPending}
                    onClick={() => setCancelPendingId(item.organization_id)}
                  >
                    {t('common.cancel')}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      {create && (
        <CreateDialog
          title={t('organizations.createTitle')}
          path="/organizations/"
          invalidate={organizationKeys.all}
          onClose={() => {
            void queryClient.invalidateQueries({ queryKey: pendingWorkspaceKey })
            setCreate(false)
          }}
          fields={[
            { name: 'name', label: t('organizations.name'), required: true, maxLength: 255 },
            {
              name: 'slug',
              label: t('organizations.slug'),
              required: true,
              maxLength: 50,
            },
            {
              name: 'owner_email',
              label: t('organizations.ownerEmail'),
              required: true,
              type: 'email',
            },
          ]}
        />
      )}
      <Dialog
        open={cancelPendingId !== null}
        onClose={() => setCancelPendingId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('organizations.cancelTitle')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{t('organizations.cancelDescription')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelPendingId(null)}>{t('organizations.keep')}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={pending.cancel.isPending}
            onClick={() => {
              if (!cancelPendingId) return
              pending.cancel.mutate(cancelPendingId, {
                onSuccess: () => setCancelPendingId(null),
              })
            }}
          >
            {t('organizations.cancelWorkspace')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
