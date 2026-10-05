import { useEffect, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Alert, Box, Button, Divider, Drawer, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import { useCreateCatalogItem, useCreateSubscription, useRecordPayment, useUpdateCatalogItem, useUpdateSubscription } from '../../features/subscriptions'
import type { Company } from '../../types/company.types'
import type { BillingInterval, Charge, CustomerSubscription, ServiceCatalogItem } from '../../types/subscription.types'

const intervals: Array<{ value: BillingInterval; label: string }> = [
  { value: 'one_off', label: 'One-off' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'semiannual', label: 'Every six months' }, { value: 'annual', label: 'Annual' },
]
const today = () => new Date().toISOString().slice(0, 10)
const drawerSx = { '& .MuiDrawer-paper': { width: { xs: '100%', sm: 580 }, maxWidth: '100vw', bgcolor: 'background.default' } }

function Header({ title, description, onClose }: { title: string; description: string; onClose: () => void }) {
  return <Stack direction="row" sx={{ p: 3, alignItems: 'flex-start', justifyContent: 'space-between' }}><Box><Typography variant="h5">{title}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: .5 }}>{description}</Typography></Box><IconButton aria-label="Close" onClick={onClose}><CloseRounded /></IconButton></Stack>
}

export function CatalogDrawer({ organizationId, item, onClose }: { organizationId: string; item?: ServiceCatalogItem; onClose: () => void }) {
  const create = useCreateCatalogItem(organizationId)
  const update = useUpdateCatalogItem(organizationId)
  const mutation = item ? update : create
  const [form, setForm] = useState({ name: item?.name ?? '', description: item?.description ?? '', internal_code: item?.internal_code ?? '', default_net_price: item?.default_net_price ?? '0.00', currency: item?.currency ?? 'EUR', default_tax_rate: item?.default_tax_rate ?? '24.00', billing_interval: item?.billing_interval ?? 'monthly' as BillingInterval, is_active: item?.is_active ?? true })
  const submit = () => {
    const body = { ...form }
    if (item) update.mutate({ id: item.id, body }, { onSuccess: onClose })
    else create.mutate(body, { onSuccess: onClose })
  }
  return <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}><Header title={item ? 'Edit catalog service' : 'Add catalog service'} description="Set reusable commercial defaults. Customer agreements keep their own copy." onClose={onClose} /><Divider /><Stack spacing={2.25} sx={{ p: 3 }}>
    {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
    <TextField required label="Service name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
    <TextField label="Internal code" value={form.internal_code} onChange={(e) => setForm({ ...form, internal_code: e.target.value })} helperText="Optional reference used by your team." />
    <TextField label="Description" multiline minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required type="number" label="Net price" value={form.default_net_price} onChange={(e) => setForm({ ...form, default_net_price: e.target.value })} fullWidth slotProps={{ htmlInput: { min: 0, step: .01 } }} /><TextField required label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} sx={{ width: { sm: 150 } }} /></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select label="Billing cycle" value={form.billing_interval} onChange={(e) => setForm({ ...form, billing_interval: e.target.value as BillingInterval })} fullWidth>{intervals.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField><TextField type="number" label="VAT rate (%)" value={form.default_tax_rate} onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })} sx={{ width: { sm: 180 } }} slotProps={{ htmlInput: { min: 0, max: 100, step: .01 } }} /></Stack>
    <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Available for new subscriptions" />
    <Button variant="contained" size="large" disabled={!form.name.trim() || mutation.isPending} onClick={submit}>{mutation.isPending ? 'Saving…' : 'Save service'}</Button>
  </Stack></Drawer>
}

export function SubscriptionDrawer({ organizationId, companies, catalog, subscription, onClose }: { organizationId: string; companies: Company[]; catalog: ServiceCatalogItem[]; subscription?: CustomerSubscription; onClose: () => void }) {
  const create = useCreateSubscription(organizationId)
  const update = useUpdateSubscription(organizationId)
  const mutation = subscription ? update : create
  const [form, setForm] = useState({ company: subscription?.company ?? '', catalog_item: subscription?.catalog_item ?? '', name: subscription?.name ?? '', net_price: subscription?.net_price ?? '0.00', currency: subscription?.currency ?? 'EUR', tax_rate: subscription?.tax_rate ?? '24.00', billing_interval: subscription?.billing_interval ?? 'monthly' as BillingInterval, start_date: subscription?.start_date ?? today(), next_billing_date: subscription?.next_billing_date ?? today(), renewal_date: subscription?.renewal_date ?? '', end_date: subscription?.end_date ?? '', auto_renew: subscription?.auto_renew ?? true, status: subscription?.status ?? 'active' as CustomerSubscription['status'], operational_reference: subscription?.operational_reference ?? '', notes: subscription?.notes ?? '' })
  useEffect(() => {
    if (subscription || !form.catalog_item) return
    const item = catalog.find((candidate) => candidate.id === form.catalog_item)
    if (item) setForm((current) => ({ ...current, name: item.name, net_price: item.default_net_price, currency: item.currency, tax_rate: item.default_tax_rate, billing_interval: item.billing_interval }))
  }, [catalog, form.catalog_item, subscription])
  const submit = () => {
    const body = { ...form, catalog_item: form.catalog_item || null, renewal_date: form.renewal_date || null, end_date: form.end_date || null }
    if (subscription) update.mutate({ id: subscription.id, body }, { onSuccess: onClose })
    else create.mutate(body, { onSuccess: onClose })
  }
  return <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}><Header title={subscription ? 'Edit customer subscription' : 'Add customer subscription'} description="Track what the customer receives, when it renews, and what is due." onClose={onClose} /><Divider /><Stack spacing={2.25} sx={{ p: 3 }}>
    {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
    <TextField select required label="Customer" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}>{companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}</TextField>
    <TextField select label="Catalog service" value={form.catalog_item} onChange={(e) => setForm({ ...form, catalog_item: e.target.value })}><MenuItem value="">Custom service</MenuItem>{catalog.filter((item) => item.is_active || item.id === form.catalog_item).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
    <TextField required label="Subscription name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required type="number" label="Net amount" value={form.net_price} onChange={(e) => setForm({ ...form, net_price: e.target.value })} fullWidth slotProps={{ htmlInput: { min: 0, step: .01 } }} /><TextField label="VAT (%)" type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} sx={{ width: { sm: 140 } }} slotProps={{ htmlInput: { min: 0, max: 100 } }} /><TextField label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} sx={{ width: { sm: 130 } }} /></Stack>
    <TextField select label="Billing cycle" value={form.billing_interval} onChange={(e) => setForm({ ...form, billing_interval: e.target.value as BillingInterval })}>{intervals.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Starts" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} /><TextField label="First charge due" type="date" value={form.next_billing_date} onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} /></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Renewal date" type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} helperText="Optional reminder for the commercial renewal." /><TextField label="End date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} helperText="No new charge is created after this date." /></Stack>
    {subscription ? <TextField select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CustomerSubscription['status'] })}><MenuItem value="active">Active</MenuItem><MenuItem value="paused">Paused</MenuItem><MenuItem value="cancelled">Cancelled</MenuItem><MenuItem value="expired">Expired</MenuItem></TextField> : null}
    <TextField label="Operational reference" value={form.operational_reference} onChange={(e) => setForm({ ...form, operational_reference: e.target.value })} helperText="Optional account, domain, asset, or contract reference." />
    <TextField label="Internal notes" multiline minRows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    <FormControlLabel control={<Switch checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} />} label="Create the next charge after full payment" />
    <Button variant="contained" size="large" disabled={!form.company || !form.name.trim() || mutation.isPending} onClick={submit}>{mutation.isPending ? 'Saving…' : 'Save subscription'}</Button>
  </Stack></Drawer>
}

export function PaymentDrawer({ organizationId, charge, onClose }: { organizationId: string; charge: Charge; onClose: () => void }) {
  const mutation = useRecordPayment(organizationId)
  const [form, setForm] = useState({ amount: charge.outstanding_amount, paid_date: today(), payment_method: '', external_reference: '', note: '' })
  return <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}><Header title="Record payment" description={`${charge.company_name} · ${charge.subscription_name}`} onClose={onClose} /><Divider /><Stack spacing={2.25} sx={{ p: 3 }}>
    <Alert severity="info">Outstanding: {Number(charge.outstanding_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {charge.currency}</Alert>
    {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
    <TextField required autoFocus type="number" label="Amount received" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} slotProps={{ htmlInput: { min: .01, max: charge.outstanding_amount, step: .01 } }} />
    <TextField required type="date" label="Payment date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
    <TextField label="Payment method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Bank transfer, card, cash…" />
    <TextField label="Reference" value={form.external_reference} onChange={(e) => setForm({ ...form, external_reference: e.target.value })} />
    <TextField label="Note" multiline minRows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
    <Button variant="contained" size="large" disabled={!form.amount || mutation.isPending} onClick={() => mutation.mutate({ chargeId: charge.id, body: form }, { onSuccess: onClose })}>{mutation.isPending ? 'Recording…' : 'Record payment'}</Button>
  </Stack></Drawer>
}
