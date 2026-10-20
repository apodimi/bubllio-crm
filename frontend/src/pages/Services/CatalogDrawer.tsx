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
import { useCreateCatalogItem, useUpdateCatalogItem } from '../../features/subscriptions'
import type { BillingInterval, ServiceCatalogItem } from '../../types/subscription.types'

import { billingIntervals } from './billingOptions'
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
      <IconButton aria-label={title} onClick={onClose}>
        <CloseRounded />
      </IconButton>
    </Stack>
  )
}

export function CatalogDrawer({
  organizationId,
  item,
  onClose,
}: {
  organizationId: string
  item?: ServiceCatalogItem
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateCatalogItem(organizationId)
  const update = useUpdateCatalogItem(organizationId)
  const mutation = item ? update : create
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    internal_code: item?.internal_code ?? '',
    default_net_price: item?.default_net_price ?? '0.00',
    currency: item?.currency ?? 'EUR',
    default_tax_rate: item?.default_tax_rate ?? '24.00',
    billing_interval: item?.billing_interval ?? ('monthly' as BillingInterval),
    is_active: item?.is_active ?? true,
  })
  const submit = () => {
    const body = { ...form }
    if (item) update.mutate({ id: item.id, body }, { onSuccess: onClose })
    else create.mutate(body, { onSuccess: onClose })
  }
  return (
    <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}>
      <Header
        title={item ? t('crm.services.drawer.editCatalog') : t('crm.services.drawer.addCatalog')}
        description={t('crm.services.drawer.catalogHint')}
        onClose={onClose}
      />
      <Divider />
      <Stack spacing={2.25} sx={{ p: 3 }}>
        {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
        <TextField
          required
          label={t('crm.services.drawer.serviceName')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
        <TextField
          label={t('crm.services.drawer.internalCode')}
          value={form.internal_code}
          onChange={(e) => setForm({ ...form, internal_code: e.target.value })}
          helperText={t('crm.services.drawer.internalCodeHint')}
        />
        <TextField
          label={t('crm.services.drawer.description')}
          multiline
          minRows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            required
            type="number"
            label={t('crm.services.drawer.netPrice')}
            value={form.default_net_price}
            onChange={(e) => setForm({ ...form, default_net_price: e.target.value })}
            fullWidth
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
          <TextField
            required
            label={t('crm.services.drawer.currency')}
            value={form.currency}
            onChange={(e) =>
              setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })
            }
            sx={{ width: { sm: 150 } }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label={t('crm.services.drawer.billingCycle')}
            value={form.billing_interval}
            onChange={(e) =>
              setForm({ ...form, billing_interval: e.target.value as BillingInterval })
            }
            fullWidth
          >
            {billingIntervals.map((interval) => (
              <MenuItem key={interval} value={interval}>
                {t(`crm.services.intervals.${interval}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="number"
            label={t('crm.services.drawer.vat')}
            value={form.default_tax_rate}
            onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })}
            sx={{ width: { sm: 180 } }}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
          />
        </Stack>
        <FormControlLabel
          control={
            <Switch
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
          }
          label={t('crm.services.drawer.available')}
        />
        <Button
          variant="contained"
          size="large"
          disabled={!form.name.trim() || mutation.isPending}
          onClick={submit}
        >
          {mutation.isPending
            ? t('crm.services.drawer.saving')
            : t('crm.services.drawer.saveService')}
        </Button>
      </Stack>
    </Drawer>
  )
}
