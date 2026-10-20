import { useState, type SubmitEvent } from 'react'
import lockIcon from '@iconify-icons/keyline-icons/lock'
import { Alert, Button, Stack, TextField } from '@mui/material'

import { AccountSettingsSection } from './AccountSettingsSection'

interface PasswordValues {
  current_password: string
  new_password: string
  confirm_password: string
}

interface PasswordSectionProps {
  isPending: boolean
  errorMessage?: string
  onChangePassword: (values: { current_password: string; new_password: string }) => Promise<unknown>
}

const EMPTY_PASSWORDS: PasswordValues = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export function PasswordSection({
  isPending,
  errorMessage,
  onChangePassword,
}: PasswordSectionProps) {
  const [values, setValues] = useState(EMPTY_PASSWORDS)
  const passwordsDoNotMatch = Boolean(
    values.confirm_password && values.new_password !== values.confirm_password,
  )

  async function changePassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.new_password !== values.confirm_password) {
      return
    }
    await onChangePassword({
      current_password: values.current_password,
      new_password: values.new_password,
    })
    setValues(EMPTY_PASSWORDS)
  }

  return (
    <AccountSettingsSection
      title="Password"
      description="Use a unique password to keep your account secure."
      icon={lockIcon}
    >
      <Stack component="form" onSubmit={changePassword} spacing={2}>
        <TextField
          label="Current password"
          type="password"
          value={values.current_password}
          onChange={(event) =>
            setValues((current) => ({ ...current, current_password: event.target.value }))
          }
          required
        />
        <TextField
          label="New password"
          type="password"
          value={values.new_password}
          onChange={(event) =>
            setValues((current) => ({ ...current, new_password: event.target.value }))
          }
          required
        />
        <TextField
          label="Confirm new password"
          type="password"
          value={values.confirm_password}
          onChange={(event) =>
            setValues((current) => ({ ...current, confirm_password: event.target.value }))
          }
          required
          error={passwordsDoNotMatch}
          helperText={passwordsDoNotMatch ? 'Passwords do not match.' : undefined}
        />
        <Button
          type="submit"
          variant="outlined"
          disabled={isPending || values.new_password !== values.confirm_password}
        >
          {isPending ? 'Updating…' : 'Change password'}
        </Button>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </Stack>
    </AccountSettingsSection>
  )
}
