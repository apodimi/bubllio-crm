import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useParams } from '@tanstack/react-router'
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  useCreateInvitation,
  useInvitationActions,
  useInvitations,
  useWorkspaceMembers,
  useMemberActions,
} from '../../features/invitations/hooks/useInvitations'
import { Failure, Loading } from '../../components/common/Feedback'
import {
  INVITABLE_ROLES,
  INVITATION_STATUS,
  type InvitationRole,
  type InvitationStatus,
} from '../../types/invitation.types'

const invitationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.enum(INVITABLE_ROLES),
})
type InvitationForm = z.infer<typeof invitationSchema>

const ALL_INVITATIONS = 'all' as const
type InvitationFilter = typeof ALL_INVITATIONS | InvitationStatus

const ROLE_LABELS: Record<InvitationRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const STATUS_LABELS: Record<InvitationStatus, string> = {
  [INVITATION_STATUS.PENDING]: 'Pending',
  [INVITATION_STATUS.ACCEPTED]: 'Accepted',
  [INVITATION_STATUS.EXPIRED]: 'Expired',
  [INVITATION_STATUS.REVOKED]: 'Revoked',
}

const STATUS_COLORS: Record<InvitationStatus, 'default' | 'success' | 'warning' | 'error'> = {
  [INVITATION_STATUS.PENDING]: 'warning',
  [INVITATION_STATUS.ACCEPTED]: 'success',
  [INVITATION_STATUS.EXPIRED]: 'default',
  [INVITATION_STATUS.REVOKED]: 'error',
}

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'

export function MembersPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' })
  const members = useWorkspaceMembers(organizationId)
  const invitations = useInvitations(organizationId)
  const create = useCreateInvitation(organizationId)
  const invitationActions = useInvitationActions(organizationId)
  const actions = useMemberActions(organizationId)
  const [sent, setSent] = useState('')
  const [invitationMessage, setInvitationMessage] = useState('')
  const [invitationFilter, setInvitationFilter] = useState<InvitationFilter>(ALL_INVITATIONS)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '', role: 'member' },
  })
  if (members.isPending || invitations.isPending) return <Loading />
  if (members.isError || invitations.isError)
    return (
      <Failure
        error={members.error ?? invitations.error ?? new Error('Could not load workspace people.')}
        retry={() => {
          void members.refetch()
          void invitations.refetch()
        }}
      />
    )

  async function submit(values: InvitationForm) {
    setSent('')
    try {
      await create.mutateAsync(values)
      setSent(`Invitation sent to ${values.email}.`)
      reset()
    } catch {
      /* The mutation error is shown below. */
    }
  }

  const filteredInvitations = invitations.data.filter(
    (invitation) => invitationFilter === ALL_INVITATIONS || invitation.status === invitationFilter,
  )

  async function resendInvitation(invitationId: string, email: string) {
    setInvitationMessage('')
    try {
      await invitationActions.resend.mutateAsync(invitationId)
      setInvitationMessage(`A new invitation was sent to ${email}. The previous link is invalid.`)
    } catch {
      /* The mutation error is shown below. */
    }
  }

  async function revokeInvitation(invitationId: string, email: string) {
    if (!window.confirm(`Revoke the invitation for ${email}?`)) return
    setInvitationMessage('')
    try {
      await invitationActions.revoke.mutateAsync(invitationId)
      setInvitationMessage(`Invitation for ${email} revoked.`)
    } catch {
      /* The mutation error is shown below. */
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 850 }}>
      <Box>
        <Typography variant="h4">People & invitations</Typography>
        <Typography color="text.secondary">
          Invite someone by email. Their role applies only to this workspace.
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack component="form" noValidate onSubmit={handleSubmit(submit)} spacing={2}>
          <Typography variant="h6">Invite a person</Typography>
          <Typography variant="body2" color="text.secondary">
            Invitations use this workspace's active default SMTP account and expire after seven
            days.
          </Typography>
          {sent && <Alert severity="success">{sent}</Alert>}
          {create.isError && <Alert severity="error">{create.error.message}</Alert>}
          <Box>
            <Typography component="label" htmlFor="invite-email" variant="body2">
              Email address
            </Typography>
            <TextField
              id="invite-email"
              fullWidth
              type="email"
              autoComplete="email"
              placeholder="teammate@example.com"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message ?? 'The invitation link is sent to this inbox.'}
            />
          </Box>
          <Box>
            <Typography component="label" htmlFor="invite-role" variant="body2">
              Role in this workspace
            </Typography>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  id="invite-role"
                  fullWidth
                  select
                  value={field.value}
                  onChange={field.onChange}
                  inputRef={field.ref}
                  slotProps={{ select: { 'aria-label': 'Role in this workspace' } }}
                  error={!!errors.role}
                  helperText={
                    errors.role?.message ??
                    'Admin manages people and settings; member edits CRM data; viewer can only read.'
                  }
                >
                  {INVITABLE_ROLES.map((role) => (
                    <MenuItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
          <Button
            type="submit"
            variant="contained"
            disabled={create.isPending}
            sx={{ alignSelf: 'flex-start' }}
          >
            {create.isPending ? 'Sending…' : 'Send invitation'}
          </Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Members
        </Typography>
        <Stack spacing={1}>
          {members.data.map((member) => (
            <Stack
              key={member.id}
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: 'divider',
                py: 1,
              }}
            >
              <Typography>
                {member.username} · {member.email}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'center' } }}
              >
                <TextField
                  select
                  size="small"
                  value={member.role}
                  disabled={member.role === 'owner' || actions.update.isPending}
                  onChange={(event) =>
                    void actions.update.mutateAsync({
                      memberId: member.id,
                      role: event.target.value as InvitationRole,
                    })
                  }
                  sx={{ minWidth: 125 }}
                  aria-label={`Role for ${member.username}`}
                >
                  {member.role === 'owner' && <MenuItem value="owner">Owner</MenuItem>}
                  {INVITABLE_ROLES.map((role) => (
                    <MenuItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </MenuItem>
                  ))}
                </TextField>
                {member.role !== 'owner' && (
                  <Button
                    size="small"
                    color="error"
                    disabled={actions.remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${member.username} from this workspace?`))
                        void actions.remove.mutateAsync(member.id)
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Stack spacing={2} sx={{ p: { xs: 2.5, sm: 3 }, pb: 2 }}>
          <Box>
            <Typography variant="h6">Invitation history</Typography>
            <Typography variant="body2" color="text.secondary">
              Track delivery status, resend a fresh secure link, or revoke access before it is
              accepted.
            </Typography>
          </Box>
          {invitationMessage && <Alert severity="success">{invitationMessage}</Alert>}
          {(invitationActions.resend.isError || invitationActions.revoke.isError) && (
            <Alert severity="error">
              {invitationActions.resend.error?.message ?? invitationActions.revoke.error?.message}
            </Alert>
          )}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={invitationFilter}
            onChange={(_, value: InvitationFilter | null) => {
              if (value) setInvitationFilter(value)
            }}
            aria-label="Invitation status filter"
            sx={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}
          >
            <ToggleButton value={ALL_INVITATIONS}>All ({invitations.data.length})</ToggleButton>
            {Object.values(INVITATION_STATUS).map((status) => (
              <ToggleButton key={status} value={status}>
                {STATUS_LABELS[status]} (
                {invitations.data.filter((invitation) => invitation.status === status).length})
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        {filteredInvitations.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: { xs: 2.5, sm: 3 }, pb: 3 }}>
            No invitations match this status.
          </Typography>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Person</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvitations.map((invitation) => {
                  const canResend = invitation.status !== INVITATION_STATUS.ACCEPTED
                  const canRevoke = invitation.status === INVITATION_STATUS.PENDING
                  const pending =
                    invitationActions.resend.isPending || invitationActions.revoke.isPending
                  return (
                    <TableRow key={invitation.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {invitation.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Invited by {invitation.invited_by ?? 'Deleted user'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{invitation.role}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[invitation.status]}
                          color={STATUS_COLORS[invitation.status]}
                          variant={
                            invitation.status === INVITATION_STATUS.PENDING ? 'filled' : 'outlined'
                          }
                        />
                      </TableCell>
                      <TableCell>{formatDate(invitation.created_at)}</TableCell>
                      <TableCell>{formatDate(invitation.expires_at)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          {canResend && (
                            <Button
                              size="small"
                              disabled={pending}
                              onClick={() => void resendInvitation(invitation.id, invitation.email)}
                            >
                              Resend
                            </Button>
                          )}
                          {canRevoke && (
                            <Button
                              size="small"
                              color="error"
                              disabled={pending}
                              onClick={() => void revokeInvitation(invitation.id, invitation.email)}
                            >
                              Revoke
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  )
}
