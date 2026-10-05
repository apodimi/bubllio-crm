import { useState } from 'react'
import type { FormEvent } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCompanyAssignees } from '../../features/companies'
import { useContacts } from '../../features/contacts'
import { useCreateDeal, useUpdateDealRecord } from '../../features/deals'
import type { Company } from '../../types/company.types'
import type { Deal, DealInput, DealStage } from '../../types/deal.types'

const stages: Array<{ value: DealStage; label: string }> = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]
const emptyDeal: DealInput = {
  company: '',
  contact: null,
  assigned_to: null,
  title: '',
  value: '0.00',
  currency: 'EUR',
  tax_rate: '24.00',
  amount_includes_tax: false,
  probability: 10,
  stage: 'lead',
  expected_close_date: null,
  lost_reason: '',
  notes: '',
}

export function DealDrawer({
  organizationId,
  companies,
  deal,
  initialStage,
  onClose,
}: {
  organizationId: string
  companies: Company[]
  deal?: Deal
  initialStage?: DealStage
  onClose: () => void
}) {
  const create = useCreateDeal(organizationId)
  const update = useUpdateDealRecord(organizationId, deal?.id ?? '')
  const mutation = deal ? update : create
  const contacts = useContacts(organizationId, { archived: 'active' })
  const assignees = useCompanyAssignees(organizationId)
  const [values, setValues] = useState<DealInput>(
    deal
      ? {
          company: deal.company,
          contact: deal.contact,
          assigned_to: deal.assigned_to,
          title: deal.title,
          value: deal.value,
          currency: deal.currency,
          tax_rate: deal.tax_rate,
          amount_includes_tax: deal.amount_includes_tax,
          probability: deal.probability,
          stage: initialStage ?? deal.stage,
          expected_close_date: deal.expected_close_date,
          lost_reason: deal.lost_reason,
          notes: deal.notes,
        }
      : { ...emptyDeal, stage: initialStage ?? 'lead' },
  )
  const companyContacts = (contacts.data ?? []).filter(
    (contact) => contact.company === values.company,
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await mutation.mutateAsync(values)
      onClose()
    } catch {
      /* Normalized API error is rendered below. */
    }
  }
  function set<K extends keyof DealInput>(name: K, value: DealInput[K]) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={mutation.isPending ? undefined : onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 600 },
          maxWidth: '100vw',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => void submit(event)}
        sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h5">{deal ? 'Edit deal' : 'Add deal'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {deal
                ? 'Update the opportunity, value and next sales milestone.'
                : 'Capture a qualified opportunity in the sales pipeline.'}
            </Typography>
          </Box>
          <IconButton aria-label="Close deal form" onClick={onClose} disabled={mutation.isPending}>
            <CloseRounded />
          </IconButton>
        </Stack>
        <Stack spacing={2.5} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 4 }}>
          {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
          <TextField
            required
            autoFocus
            label="Deal title"
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            disabled={mutation.isPending}
          />
          <TextField
            select
            required
            label="Company"
            value={values.company}
            onChange={(event) => {
              setValues((current) => ({ ...current, company: event.target.value, contact: null }))
            }}
            disabled={mutation.isPending}
          >
            {companies.map((company) => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Contact"
              value={values.contact ?? ''}
              onChange={(event) => set('contact', event.target.value || null)}
              disabled={!values.company || mutation.isPending}
              sx={{ flex: 1 }}
            >
              <MenuItem value="">No contact</MenuItem>
              {companyContacts.map((contact) => (
                <MenuItem key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Owner"
              value={values.assigned_to ?? ''}
              onChange={(event) =>
                set('assigned_to', event.target.value ? Number(event.target.value) : null)
              }
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {(assignees.data ?? []).map((person) => (
                <MenuItem key={person.id} value={person.id}>
                  {person.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              required
              type="number"
              label="Amount"
              value={values.value}
              onChange={(event) => set('value', event.target.value)}
              disabled={mutation.isPending}
              sx={{ flex: 2 }}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
            <TextField
              select
              label="Currency"
              value={values.currency}
              onChange={(event) => set('currency', event.target.value)}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
            >
              {['EUR', 'USD', 'GBP'].map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="number"
              label="VAT rate %"
              value={values.tax_rate}
              onChange={(event) => set('tax_rate', event.target.value)}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
            />
            <TextField
              select
              label="Amount basis"
              value={values.amount_includes_tax ? 'gross' : 'net'}
              onChange={(event) => set('amount_includes_tax', event.target.value === 'gross')}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
            >
              <MenuItem value="net">Net — VAT excluded</MenuItem>
              <MenuItem value="gross">Gross — VAT included</MenuItem>
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Status"
              value={values.stage}
              onChange={(event) => set('stage', event.target.value as DealStage)}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
            >
              {stages.map((stage) => (
                <MenuItem key={stage.value} value={stage.value}>
                  {stage.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Win probability %"
              value={values.probability}
              onChange={(event) => set('probability', Number(event.target.value))}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
          </Stack>
          <TextField
            type="date"
            label="Expected close date"
            value={values.expected_close_date ?? ''}
            onChange={(event) => set('expected_close_date', event.target.value || null)}
            disabled={mutation.isPending}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {values.stage === 'lost' ? (
            <TextField
              required
              label="Lost reason"
              value={values.lost_reason}
              onChange={(event) => set('lost_reason', event.target.value)}
              disabled={mutation.isPending}
              helperText="Capture why the opportunity was lost."
            />
          ) : null}
          <TextField
            multiline
            minRows={4}
            label="Internal notes"
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
            disabled={mutation.isPending}
          />
        </Stack>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            justifyContent: 'flex-end',
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : deal ? 'Save changes' : 'Create deal'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
