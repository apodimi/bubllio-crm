import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'

import { useContacts } from '../../contacts'
import { useAddCompanyCommunication } from '../hooks/useCompanies'

const localNow = () => {
  const date = new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function CompanyCommunicationDialog({
  organizationId,
  companyId,
  initialContactId,
  initialKind,
  showFollowUpOption = true,
  onClose,
  onSaved,
}: {
  organizationId: string
  companyId: string
  initialContactId?: string | null
  initialKind?: 'call' | 'email' | 'meeting'
  showFollowUpOption?: boolean
  onClose: () => void
  onSaved: (addFollowUp: boolean, contactId: string | null) => void
}) {
  const { t } = useTranslation()
  const mutation = useAddCompanyCommunication(organizationId, companyId)
  const contacts = useContacts(organizationId, { company: companyId, archived: 'active' })
  const [kind, setKind] = useState<'call' | 'email' | 'meeting'>(initialKind ?? 'call')
  const [contact, setContact] = useState(initialContactId ?? '')
  const [outcome, setOutcome] = useState('')
  const [body, setBody] = useState('')
  const [occurredAt, setOccurredAt] = useState(localNow)
  const [addFollowUp, setAddFollowUp] = useState(false)

  async function submit() {
    if (!outcome.trim()) {
      return
    }
    try {
      await mutation.mutateAsync({
        kind,
        contact: contact || null,
        outcome: outcome.trim(),
        body: body.trim(),
        occurred_at: new Date(occurredAt).toISOString(),
      })
      onSaved(addFollowUp, contact || null)
    } catch {
      // Normalized API error is rendered below.
    }
  }

  return (
    <Dialog open onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('crm.companies.timeline.communication.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={kind}
            onChange={(_, value) => {
              if (value) {
                setKind(value)
              }
            }}
            aria-label={t('crm.companies.timeline.communication.type')}
          >
            <ToggleButton value="call">
              {t('crm.companies.timeline.communication.call')}
            </ToggleButton>
            <ToggleButton value="email">
              {t('crm.companies.timeline.communication.email')}
            </ToggleButton>
            <ToggleButton value="meeting">
              {t('crm.companies.timeline.communication.meeting')}
            </ToggleButton>
          </ToggleButtonGroup>
          <TextField
            select
            label={t('crm.companies.timeline.communication.contact')}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            disabled={contacts.isPending}
          >
            <MenuItem value="">{t('crm.companies.timeline.communication.companyOnly')}</MenuItem>
            {(contacts.data ?? []).map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.first_name} {item.last_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            autoFocus
            label={t('crm.companies.timeline.communication.outcome')}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            placeholder={t('crm.companies.timeline.communication.outcomePlaceholder')}
          />
          <TextField
            multiline
            minRows={3}
            label={t('crm.companies.timeline.communication.notes')}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <TextField
            type="datetime-local"
            label={t('crm.companies.timeline.communication.when')}
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {showFollowUpOption ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={addFollowUp}
                  onChange={(event) => setAddFollowUp(event.target.checked)}
                />
              }
              label={t('crm.companies.timeline.communication.addFollowUp')}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={!outcome.trim() || mutation.isPending}
        >
          {mutation.isPending
            ? t('crm.companies.timeline.communication.saving')
            : t('crm.companies.timeline.communication.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
