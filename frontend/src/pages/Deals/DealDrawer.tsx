import { useState } from 'react'
import type { SubmitEvent } from 'react'
import closeIcon from '@iconify-icons/keyline-icons/x'
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
import { useTranslation } from 'react-i18next'
import { AppIcon } from '../../components/common/AppIcon'
import { useCompanyAssignees } from '../../features/companies'
import { useContacts } from '../../features/contacts'
import { DEAL_STAGES } from '../../features/deals/dealBoardConfig'
import { useCreateDeal, useUpdateDealRecord } from '../../features/deals'
import type { Company } from '../../types/company.types'
import type { Deal, DealInput, DealStage } from '../../types/deal.types'

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
  const { t } = useTranslation()
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
  const selectedContactAvailable =
    !values.contact || companyContacts.some((contact) => contact.id === values.contact)
  const selectedAssigneeAvailable =
    !values.assigned_to || (assignees.data ?? []).some((person) => person.id === values.assigned_to)
  let submitLabel = t('crm.deals.drawer.create')
  if (mutation.isPending) {
    submitLabel = t('crm.deals.drawer.saving')
  } else if (deal) {
    submitLabel = t('crm.deals.drawer.saveChanges')
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
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
            <Typography variant="h5">
              {deal ? t('crm.deals.drawer.editTitle') : t('crm.deals.drawer.addTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {deal ? t('crm.deals.drawer.editDescription') : t('crm.deals.drawer.addDescription')}
            </Typography>
          </Box>
          <IconButton
            aria-label={t('crm.deals.drawer.close')}
            onClick={onClose}
            disabled={mutation.isPending}
          >
            <AppIcon icon={closeIcon} />
          </IconButton>
        </Stack>
        <Stack spacing={2.5} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 4 }}>
          {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
          <TextField
            required
            autoFocus
            label={t('crm.deals.drawer.title')}
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            disabled={mutation.isPending}
          />
          <TextField
            select
            required
            label={t('crm.deals.drawer.company')}
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
              label={t('crm.deals.drawer.contact')}
              value={values.contact ?? ''}
              onChange={(event) => set('contact', event.target.value || null)}
              disabled={!values.company || mutation.isPending}
              sx={{ flex: 1 }}
            >
              <MenuItem value="">{t('crm.deals.drawer.noContact')}</MenuItem>
              {!selectedContactAvailable && values.contact ? (
                <MenuItem value={values.contact}>
                  {deal?.contact_name || t('crm.deals.drawer.selectedContact')}
                </MenuItem>
              ) : null}
              {companyContacts.map((contact) => (
                <MenuItem key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('crm.deals.drawer.owner')}
              value={values.assigned_to ?? ''}
              onChange={(event) =>
                set('assigned_to', event.target.value ? Number(event.target.value) : null)
              }
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
            >
              <MenuItem value="">{t('crm.deals.drawer.unassigned')}</MenuItem>
              {!selectedAssigneeAvailable && values.assigned_to ? (
                <MenuItem value={values.assigned_to}>
                  {deal?.assigned_to_name || t('crm.deals.drawer.selectedOwner')}
                </MenuItem>
              ) : null}
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
              label={t('crm.deals.drawer.amount')}
              value={values.value}
              onChange={(event) => set('value', event.target.value)}
              disabled={mutation.isPending}
              sx={{ flex: 2 }}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
            <TextField
              select
              label={t('crm.deals.drawer.currency')}
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
              label={t('crm.deals.drawer.taxRate')}
              value={values.tax_rate}
              onChange={(event) => set('tax_rate', event.target.value)}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
            />
            <TextField
              select
              label={t('crm.deals.drawer.amountBasis')}
              value={values.amount_includes_tax ? 'gross' : 'net'}
              onChange={(event) => set('amount_includes_tax', event.target.value === 'gross')}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
            >
              <MenuItem value="net">{t('crm.deals.drawer.netBasis')}</MenuItem>
              <MenuItem value="gross">{t('crm.deals.drawer.grossBasis')}</MenuItem>
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label={t('crm.deals.stage')}
              value={values.stage}
              onChange={(event) => set('stage', event.target.value as DealStage)}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
            >
              {DEAL_STAGES.map((stage) => (
                <MenuItem key={stage} value={stage}>
                  {t(`crm.deals.stageLabels.${stage}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label={t('crm.deals.drawer.probability')}
              value={values.probability}
              onChange={(event) => set('probability', Number(event.target.value))}
              disabled={mutation.isPending}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
          </Stack>
          <TextField
            type="date"
            label={t('crm.deals.drawer.expectedClose')}
            value={values.expected_close_date ?? ''}
            onChange={(event) => set('expected_close_date', event.target.value || null)}
            disabled={mutation.isPending}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {values.stage === 'lost' ? (
            <TextField
              required
              label={t('crm.deals.drawer.lostReason')}
              value={values.lost_reason}
              onChange={(event) => set('lost_reason', event.target.value)}
              disabled={mutation.isPending}
              helperText={t('crm.deals.drawer.lostReasonHelp')}
            />
          ) : null}
          <TextField
            multiline
            minRows={4}
            label={t('crm.deals.drawer.notes')}
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
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {submitLabel}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
