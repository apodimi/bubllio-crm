import { useState, type SubmitEvent } from 'react'
import shieldCheckIcon from '@iconify-icons/keyline-icons/shield-check'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'

import { AccountSettingsSection } from './AccountSettingsSection'

interface InstallationAdministrators {
  administrators: Array<{ id: number; username: string; email: string }>
  invitations: Array<{ id: string; email: string }>
}

interface InstallationAdministratorsSectionProps {
  data?: InstallationAdministrators
  isPending: boolean
  isListPending: boolean
  listErrorMessage?: string
  isSuccess: boolean
  errorMessage?: string
  onInvite: (email: string) => Promise<unknown>
}

export function InstallationAdministratorsSection({
  data,
  isPending,
  isListPending,
  listErrorMessage,
  isSuccess,
  errorMessage,
  onInvite,
}: InstallationAdministratorsSectionProps) {
  const [email, setEmail] = useState('')

  async function inviteAdministrator(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    await onInvite(email.trim())
    setEmail('')
  }

  return (
    <AccountSettingsSection
      title="Installation administrators"
      description="Invite trusted IT staff to manage server-wide settings and other installation administrators. They can see workspace data only when they are also added to that workspace."
      icon={shieldCheckIcon}
    >
      <Stack
        component="form"
        onSubmit={inviteAdministrator}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
      >
        <TextField
          label="Administrator email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          sx={{ flex: 1 }}
        />
        <Button type="submit" variant="contained" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send invitation'}
        </Button>
      </Stack>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {isSuccess ? <Alert severity="success">Invitation sent.</Alert> : null}
      {listErrorMessage ? <Alert severity="error">{listErrorMessage}</Alert> : null}
      {isListPending ? (
        <Typography variant="body2" color="text.secondary">
          Loading administrators…
        </Typography>
      ) : data ? (
        <AdministratorLists data={data} />
      ) : null}
    </AccountSettingsSection>
  )
}

function AdministratorLists({ data }: { data: InstallationAdministrators }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">Active administrators</Typography>
      {data.administrators.map((administrator) => (
        <Typography key={administrator.id} variant="body2">
          {administrator.username} · {administrator.email}
        </Typography>
      ))}
      <Typography variant="subtitle2" sx={{ pt: 1 }}>
        Pending invitations
      </Typography>
      {data.invitations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      ) : (
        data.invitations.map((invitation) => (
          <Typography key={invitation.id} variant="body2">
            {invitation.email}
          </Typography>
        ))
      )}
    </Stack>
  )
}
