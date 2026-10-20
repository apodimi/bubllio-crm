import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CloseRounded from '@mui/icons-material/CloseRounded'
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import {
  useCancelSubscription,
  useCreateSubscription,
  usePauseSubscription,
  useResumeSubscription,
  useUpdateSubscription,
} from '../../features/subscriptions'
import type { Company } from '../../types/company.types'
import type {
  BillingInterval,
  CustomerSubscription,
  ServiceCatalogItem,
} from '../../types/subscription.types'

const intervals: Array<{ value: BillingInterval; label: string }> = [
  { value: 'one_off', label: 'One-off' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semiannual', label: 'Every six months' },
  { value: 'annual', label: 'Annual' },
]
const today = () => new Date().toISOString().slice(0, 10)
const drawerSx = {
  '& .MuiDrawer-paper': {
    width: { xs: '100%', sm: 580 },
    maxWidth: '100vw',
    bgcolor: 'background.default',
  },
}

function Header({
  title,
  description,
  onClose,
}: {
  title: string
  description: string
  onClose: () => void
}) {
  return (
    <Stack direction="row" sx={{ p: 3, alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="h5">{title}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
      <IconButton aria-label="Close" onClick={onClose}>
        <CloseRounded />
      </IconButton>
    </Stack>
  )
}

export function SubscriptionDrawer({
  organizationId,
  companies,
  catalog,
  subscription,
  onClose,
}: {
  organizationId: string
  companies: Company[]
  catalog: ServiceCatalogItem[]
  subscription?: CustomerSubscription
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateSubscription(organizationId)
  const update = useUpdateSubscription(organizationId)
  const mutation = subscription ? update : create
  const cancel = useCancelSubscription(organizationId)
  const pause = usePauseSubscription(organizationId)
  const resume = useResumeSubscription(organizationId)
  const [confirmCancellation, setConfirmCancellation] = useState(false)
  const [form, setForm] = useState({
    company: subscription?.company ?? '',
    catalog_item: subscription?.catalog_item ?? '',
    name: subscription?.name ?? '',
    net_price: subscription?.net_price ?? '0.00',
    currency: subscription?.currency ?? 'EUR',
    tax_rate: subscription?.tax_rate ?? '24.00',
    billing_interval: subscription?.billing_interval ?? ('monthly' as BillingInterval),
    start_date: subscription?.start_date ?? today(),
    next_billing_date: subscription?.next_billing_date ?? today(),
    renewal_date: subscription?.renewal_date ?? '',
    end_date: subscription?.end_date ?? '',
    auto_renew: subscription?.auto_renew ?? true,
    operational_reference: subscription?.operational_reference ?? '',
    notes: subscription?.notes ?? '',
  })
  const usesCatalogDefaults = !subscription && Boolean(form.catalog_item)

  function selectCatalogItem(catalogItemId: string) {
    const item = catalog.find((candidate) => candidate.id === catalogItemId)
    setForm((current) => ({
      ...current,
      catalog_item: catalogItemId,
      ...(item && !subscription
        ? {
            name: item.name,
            net_price: item.default_net_price,
            currency: item.currency,
            tax_rate: item.default_tax_rate,
            billing_interval: item.billing_interval,
          }
        : {}),
    }))
  }
  const submit = () => {
    const normalizedDates = {
      catalog_item: form.catalog_item || null,
      renewal_date: form.renewal_date || null,
      end_date: form.end_date || null,
    }
    if (subscription) {
      const body = {
        ...form,
        ...normalizedDates,
      }
      update.mutate({ id: subscription.id, body }, { onSuccess: onClose })
    } else if (usesCatalogDefaults) {
      create.mutate(
        {
          company: form.company,
          catalog_item: form.catalog_item,
          start_date: form.start_date,
          auto_renew: form.auto_renew,
          operational_reference: form.operational_reference,
          notes: form.notes,
        },
        { onSuccess: onClose },
      )
    } else {
      create.mutate({ ...form, ...normalizedDates }, { onSuccess: onClose })
    }
  }
  return (
    <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}>
      <Header
        title={
          subscription
            ? t('crm.services.drawer.editCustomer')
            : t('crm.services.drawer.addCustomer')
        }
        description={t('crm.services.drawer.customerHint')}
        onClose={onClose}
      />
      <Divider />
      <Stack spacing={2.25} sx={{ p: 3 }}>
        {mutation.isError || cancel.isError || pause.isError || resume.isError ? (
          <Alert severity="error">
            {mutation.error?.message ??
              cancel.error?.message ??
              pause.error?.message ??
              resume.error?.message}
          </Alert>
        ) : null}
        {subscription?.effective_status === 'cancelling' &&
        subscription.cancellation_effective_date ? (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                disabled={resume.isPending}
                onClick={() => resume.mutate(subscription.id, { onSuccess: onClose })}
              >
                {resume.isPending ? 'Resuming…' : 'Keep active'}
              </Button>
            }
          >
            Service remains active through{' '}
            {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
              new Date(`${subscription.cancellation_effective_date}T00:00:00`),
            )}
            . No later charge will be collected.
          </Alert>
        ) : null}
        <TextField
          select
          required
          label={t('crm.services.drawer.customer')}
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        >
          {companies.map((company) => (
            <MenuItem key={company.id} value={company.id}>
              {company.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('crm.services.drawer.catalogService')}
          value={form.catalog_item}
          onChange={(event) => selectCatalogItem(event.target.value)}
        >
          <MenuItem value="">{t('crm.services.drawer.customService')}</MenuItem>
          {catalog
            .filter((item) => item.is_active || item.id === form.catalog_item)
            .map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
        </TextField>
        {usesCatalogDefaults ? (
          <Alert severity="info">{t('crm.services.drawer.catalogDefaults')}</Alert>
        ) : (
          <>
            <TextField
              required
              label={t('crm.services.drawer.serviceName')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                type="number"
                label={t('crm.services.drawer.netAmount')}
                value={form.net_price}
                onChange={(e) => setForm({ ...form, net_price: e.target.value })}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
              <TextField
                label={t('crm.services.drawer.vat')}
                type="number"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                sx={{ width: { sm: 140 } }}
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
              />
              <TextField
                label={t('crm.services.drawer.currency')}
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })
                }
                sx={{ width: { sm: 130 } }}
              />
            </Stack>
            <TextField
              select
              label={t('crm.services.drawer.billingCycle')}
              value={form.billing_interval}
              onChange={(e) =>
                setForm({ ...form, billing_interval: e.target.value as BillingInterval })
              }
            >
              {intervals.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={t('crm.services.drawer.starts')}
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {!usesCatalogDefaults ? (
            <TextField
              label={t('crm.services.drawer.firstCharge')}
              type="date"
              value={form.next_billing_date}
              onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          ) : null}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={t('crm.services.drawer.renewalDate')}
            type="date"
            value={form.renewal_date}
            onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={t('crm.services.drawer.renewalHint')}
          />
          <TextField
            label={t('crm.services.drawer.endDate')}
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={t('crm.services.drawer.endDateHint')}
          />
        </Stack>
        <TextField
          label={t('crm.services.drawer.reference')}
          value={form.operational_reference}
          onChange={(e) => setForm({ ...form, operational_reference: e.target.value })}
          helperText={t('crm.services.drawer.referenceHint')}
        />
        <TextField
          label={t('crm.services.drawer.notes')}
          multiline
          minRows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.auto_renew}
              onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })}
            />
          }
          label={t('crm.services.drawer.autoRenew')}
        />
        <Button
          variant="contained"
          size="large"
          disabled={
            !form.company ||
            (!usesCatalogDefaults && !form.name.trim()) ||
            mutation.isPending ||
            cancel.isPending ||
            resume.isPending
          }
          onClick={submit}
        >
          {mutation.isPending
            ? t('crm.services.drawer.saving')
            : t('crm.services.drawer.saveCustomer')}
        </Button>
        {subscription?.effective_status === 'active' ? (
          <Button
            variant="outlined"
            disabled={pause.isPending}
            onClick={() => pause.mutate(subscription.id, { onSuccess: onClose })}
          >
            {pause.isPending ? t('crm.services.drawer.pausing') : t('crm.services.drawer.pause')}
          </Button>
        ) : null}
        {subscription?.effective_status === 'paused' ? (
          <Button
            variant="outlined"
            disabled={resume.isPending}
            onClick={() => resume.mutate(subscription.id, { onSuccess: onClose })}
          >
            {resume.isPending ? t('crm.services.drawer.resuming') : t('crm.services.drawer.resume')}
          </Button>
        ) : null}
        {subscription &&
        !['cancelling', 'cancelled', 'expired'].includes(subscription.effective_status) ? (
          <>
            <Divider />
            {confirmCancellation ? (
              <Alert severity="warning">
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Ending at period close keeps the service available through the current coverage
                  period and cancels only later charges.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    color="warning"
                    variant="contained"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(
                        { id: subscription.id, mode: 'end_of_period' },
                        { onSuccess: onClose },
                      )
                    }
                  >
                    {cancel.isPending ? 'Scheduling…' : 'End at period close'}
                  </Button>
                  <Button
                    color="error"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(
                        { id: subscription.id, mode: 'immediate' },
                        { onSuccess: onClose },
                      )
                    }
                  >
                    End immediately
                  </Button>
                  <Button color="inherit" onClick={() => setConfirmCancellation(false)}>
                    Keep subscription
                  </Button>
                </Stack>
              </Alert>
            ) : (
              <Button color="error" variant="outlined" onClick={() => setConfirmCancellation(true)}>
                {t('crm.services.drawer.end')}
              </Button>
            )}
          </>
        ) : null}
      </Stack>
    </Drawer>
  )
}
