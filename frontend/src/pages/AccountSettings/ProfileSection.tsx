import { useState, type SubmitEvent } from 'react'
import userIcon from '@iconify-icons/keyline-icons/user'
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material'

import { AccountSettingsSection } from './AccountSettingsSection'

export interface AccountProfile {
  username: string
  email: string
  display_name: string
  first_name: string
  last_name: string
  marketing_consent: boolean
}

export interface AccountProfileInput extends Record<string, unknown> {
  email: string
  display_name: string
  first_name: string
  last_name: string
  marketing_consent: boolean
  privacy_policy_accepted: true
}

interface ProfileSectionProps {
  profile?: AccountProfile
  isPending: boolean
  errorMessage?: string
  onSave: (values: AccountProfileInput) => Promise<unknown>
}

const EMPTY_PROFILE = {
  email: '',
  display_name: '',
  first_name: '',
  last_name: '',
}

export function ProfileSection({ profile, isPending, errorMessage, onSave }: ProfileSectionProps) {
  const [values, setValues] = useState(() =>
    profile
      ? {
          email: profile.email,
          display_name: profile.display_name,
          first_name: profile.first_name,
          last_name: profile.last_name,
        }
      : EMPTY_PROFILE,
  )
  const [marketingConsent, setMarketingConsent] = useState(
    () => profile?.marketing_consent ?? false,
  )

  async function saveProfile(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSave({
      ...values,
      marketing_consent: marketingConsent,
      privacy_policy_accepted: true,
    })
  }

  return (
    <AccountSettingsSection
      title="Profile"
      description="How your name and email appear across Bubllio."
      icon={userIcon}
    >
      <Stack component="form" onSubmit={saveProfile} spacing={2}>
        <TextField
          label="Email"
          type="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          required
        />
        <TextField
          label="Display name"
          value={values.display_name}
          onChange={(event) =>
            setValues((current) => ({ ...current, display_name: event.target.value }))
          }
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            sx={{ flex: 1 }}
            label="First name"
            value={values.first_name}
            onChange={(event) =>
              setValues((current) => ({ ...current, first_name: event.target.value }))
            }
          />
          <TextField
            sx={{ flex: 1 }}
            label="Last name"
            value={values.last_name}
            onChange={(event) =>
              setValues((current) => ({ ...current, last_name: event.target.value }))
            }
          />
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              checked={marketingConsent}
              onChange={(event) => setMarketingConsent(event.target.checked)}
            />
          }
          label="I agree to receive optional product updates by email."
        />
        <Button type="submit" variant="contained" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save profile'}
        </Button>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </Stack>
    </AccountSettingsSection>
  )
}
