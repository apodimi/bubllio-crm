import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useParams } from '@tanstack/react-router'
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useCreateInvitation, useInvitations, useWorkspaceMembers } from '../../features/invitations/hooks/useInvitations'
import { Failure, Loading } from '../../components/common/Feedback'

const invitationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.enum(['admin', 'member', 'viewer']),
})
type InvitationForm = z.infer<typeof invitationSchema>

export function MembersPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' })
  const members = useWorkspaceMembers(organizationId)
  const invitations = useInvitations(organizationId)
  const create = useCreateInvitation(organizationId)
  const [sent, setSent] = useState('')
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema), defaultValues: { email: '', role: 'member' },
  })
  if (members.isPending || invitations.isPending) return <Loading />
  if (members.isError || invitations.isError) return <Failure error={members.error ?? invitations.error ?? new Error('Could not load workspace people.')} retry={() => { void members.refetch(); void invitations.refetch() }} />

  async function submit(values: InvitationForm) {
    setSent('')
    try {
      await create.mutateAsync(values)
      setSent(`Invitation sent to ${values.email}.`)
      reset()
    } catch { /* The mutation error is shown below. */ }
  }

  return <Stack spacing={3} sx={{ maxWidth: 850 }}>
    <Box>
      <Typography variant="h4">People & invitations</Typography>
      <Typography color="text.secondary">Invite someone by email. Their role applies only to this workspace.</Typography>
    </Box>
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Stack component="form" noValidate onSubmit={handleSubmit(submit)} spacing={2}>
        <Typography variant="h6">Invite a person</Typography>
        <Typography variant="body2" color="text.secondary">Invitations use this workspace's active default SMTP account and expire after seven days.</Typography>
        {sent && <Alert severity="success">{sent}</Alert>}
        {create.isError && <Alert severity="error">{create.error.message}</Alert>}
        <Box>
          <Typography component="label" htmlFor="invite-email" variant="body2">Email address</Typography>
          <TextField id="invite-email" fullWidth type="email" autoComplete="email" placeholder="teammate@example.com" {...register('email')} error={!!errors.email} helperText={errors.email?.message ?? 'The invitation link is sent to this inbox.'} />
        </Box>
        <Box>
          <Typography component="label" htmlFor="invite-role" variant="body2">Role in this workspace</Typography>
          <Controller name="role" control={control} render={({ field }) =>
            <TextField id="invite-role" fullWidth select value={field.value} onChange={field.onChange} inputRef={field.ref} slotProps={{ select: { 'aria-label': 'Role in this workspace' } }} error={!!errors.role} helperText={errors.role?.message ?? 'Admin manages people and settings; member edits CRM data; viewer can only read.'}>
              <MenuItem value="admin">Admin</MenuItem><MenuItem value="member">Member</MenuItem><MenuItem value="viewer">Viewer</MenuItem>
            </TextField>
          } />
        </Box>
        <Button type="submit" variant="contained" disabled={create.isPending} sx={{ alignSelf: 'flex-start' }}>{create.isPending ? 'Sending…' : 'Send invitation'}</Button>
      </Stack>
    </Paper>
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Members</Typography>
      <Stack spacing={1}>{members.data.map(member => <Stack key={member.id} direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', py: 1 }}><Typography>{member.username} · {member.email}</Typography><Typography color="text.secondary">{member.role}</Typography></Stack>)}</Stack>
    </Paper>
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Pending invitations</Typography>
      {invitations.data.length === 0 ? <Typography color="text.secondary">No pending invitations.</Typography> : <Stack spacing={1}>{invitations.data.map(invite => <Stack key={invite.id} direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', py: 1 }}><Typography>{invite.email}</Typography><Typography color="text.secondary">{invite.role}</Typography></Stack>)}</Stack>}
    </Paper>
  </Stack>
}
