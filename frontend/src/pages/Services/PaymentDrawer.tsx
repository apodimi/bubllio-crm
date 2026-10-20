import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CloseRounded from '@mui/icons-material/CloseRounded'
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useRecordPayment } from '../../features/subscriptions'
import type { Charge } from '../../types/subscription.types'

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
      <IconButton aria-label={title} onClick={onClose}>
        <CloseRounded />
      </IconButton>
    </Stack>
  )
}

export function PaymentDrawer({
  organizationId,
  charge,
  onClose,
}: {
  organizationId: string
  charge: Charge
  onClose: () => void
}) {
  const { t } = useTranslation()
  const mutation = useRecordPayment(organizationId)
  const [form, setForm] = useState({
    amount: charge.outstanding_amount,
    paid_date: today(),
    payment_method: '',
    external_reference: '',
    note: '',
  })
  return (
    <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}>
      <Header
        title={t('crm.services.drawer.recordPayment')}
        description={`${charge.company_name} · ${charge.subscription_name}`}
        onClose={onClose}
      />
      <Divider />
      <Stack spacing={2.25} sx={{ p: 3 }}>
        <Alert severity="info">
          {t('crm.services.drawer.outstanding', {
            amount: Number(charge.outstanding_amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            }),
            currency: charge.currency,
          })}
        </Alert>
        {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
        <TextField
          required
          autoFocus
          type="number"
          label={t('crm.services.drawer.amountReceived')}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          slotProps={{ htmlInput: { min: 0.01, max: charge.outstanding_amount, step: 0.01 } }}
        />
        <TextField
          required
          type="date"
          label={t('crm.services.drawer.paymentDate')}
          value={form.paid_date}
          onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label={t('crm.services.drawer.paymentMethod')}
          value={form.payment_method}
          onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
          placeholder={t('crm.services.drawer.paymentMethodPlaceholder')}
        />
        <TextField
          label={t('crm.services.drawer.paymentReference')}
          value={form.external_reference}
          onChange={(e) => setForm({ ...form, external_reference: e.target.value })}
        />
        <TextField
          label={t('crm.services.drawer.note')}
          multiline
          minRows={3}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <Button
          variant="contained"
          size="large"
          disabled={!form.amount || mutation.isPending}
          onClick={() =>
            mutation.mutate({ chargeId: charge.id, body: form }, { onSuccess: onClose })
          }
        >
          {mutation.isPending
            ? t('crm.services.drawer.recording')
            : t('crm.services.drawer.recordPayment')}
        </Button>
      </Stack>
    </Drawer>
  )
}
