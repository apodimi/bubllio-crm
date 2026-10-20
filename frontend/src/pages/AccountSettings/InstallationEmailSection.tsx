import { useState, type SubmitEvent } from 'react'
import mailIcon from '@iconify-icons/keyline-icons/mail'
import { Alert, Button, Stack, TextField } from '@mui/material'

import { AccountSettingsSection } from './AccountSettingsSection'

export interface InstallationEmailAccount {
  name: string
  host: string
  port: number
  username: string
  from_email: string
}

export interface InstallationEmailInput extends Record<string, unknown> {
  name: string
  host: string
  port: number
  username: string
  from_email: string
  password?: string
  is_default: true
  is_active: true
  use_tls: true
  use_ssl: false
}

interface EmailFormValues {
  name: string
  host: string
  port: string
  username: string
  password: string
  from_email: string
}

const EMPTY_EMAIL_VALUES: EmailFormValues = {
  name: 'Installation SMTP',
  host: '',
  port: '587',
  username: '',
  password: '',
  from_email: '',
}

const EMAIL_FIELDS = [
  { name: 'name', label: 'Connection name', type: 'text' },
  { name: 'host', label: 'Email server address', type: 'text' },
  { name: 'port', label: 'Email server port', type: 'number' },
  { name: 'username', label: 'Email account username', type: 'text' },
  { name: 'from_email', label: 'Sender email address', type: 'email' },
] as const

interface InstallationEmailSectionProps {
  account: InstallationEmailAccount | null | undefined
  isPending: boolean
  errorMessage?: string
  onSave: (values: InstallationEmailInput) => Promise<unknown>
}

export function InstallationEmailSection({
  account,
  isPending,
  errorMessage,
  onSave,
}: InstallationEmailSectionProps) {
  const [values, setValues] = useState<EmailFormValues>(() =>
    account
      ? {
          name: account.name,
          host: account.host,
          port: String(account.port),
          username: account.username,
          password: '',
          from_email: account.from_email,
        }
      : EMPTY_EMAIL_VALUES,
  )

  async function saveEmailConnection(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const { password, ...smtpValues } = values
    await onSave({
      ...smtpValues,
      port: Number(values.port),
      ...(password ? { password } : {}),
      is_default: true,
      is_active: true,
      use_tls: true,
      use_ssl: false,
    })
    setValues((current) => ({ ...current, password: '' }))
  }

  return (
    <AccountSettingsSection
      title="Default email connection"
      description="Sends invitations and password reset messages when a workspace does not have its own email connection."
      icon={mailIcon}
    >
      {account ? (
        <Alert severity="success">
          Email is ready through {account.host}. It is used only when a workspace has no email
          connection of its own.
        </Alert>
      ) : (
        <Alert severity="info">
          No default email connection is set. Some invitations and password reset messages may not
          be delivered.
        </Alert>
      )}
      <Stack component="form" onSubmit={saveEmailConnection} spacing={2}>
        {EMAIL_FIELDS.map((field) => (
          <TextField
            key={field.name}
            label={field.label}
            type={field.type}
            value={values[field.name]}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.name]: event.target.value }))
            }
            required
          />
        ))}
        <TextField
          label="Email account password"
          type="password"
          value={values.password}
          onChange={(event) =>
            setValues((current) => ({ ...current, password: event.target.value }))
          }
          required={!account}
          helperText={
            account
              ? 'Leave this empty to keep the saved password. Enter a value only when changing it.'
              : 'The password is encrypted before it is stored.'
          }
        />
        <Button type="submit" variant="contained" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save email connection'}
        </Button>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </Stack>
    </AccountSettingsSection>
  )
}
