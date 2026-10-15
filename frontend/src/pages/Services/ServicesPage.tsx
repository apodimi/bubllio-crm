import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddRounded from '@mui/icons-material/AddRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { useCompanies } from '../../features/companies'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useCatalog, useCharges, useSubscriptions } from '../../features/subscriptions'
import type {
  Charge,
  CustomerSubscription,
  ServiceCatalogItem,
} from '../../types/subscription.types'
import { CatalogDrawer, PaymentDrawer, SubscriptionDrawer } from './ServiceDrawers'

type ServicesView = 'customer-services' | 'billing' | 'catalog'
type Translate = (key: string, options?: Record<string, unknown>) => string
const intervalLabels = {
  one_off: 'One-off',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Every 6 months',
  annual: 'Annual',
}
const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  paused: 'warning',
  cancelling: 'warning',
  cancelled: 'default',
  expired: 'error',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'error',
  due: 'info',
  upcoming: 'default',
  waived: 'default',
}
const label = (value: string) =>
  value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
const money = (amount: string, currency: string) =>
  `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`),
  )

function ServicesPage({ view }: { view: ServicesView }) {
  const { t } = useTranslation()
  const translate: Translate = (key, options) => String(t(key as never, options as never))
  const organization = useWorkspace()
  const canManage = canCreateRecords(organization)
  const [catalogDrawer, setCatalogDrawer] = useState<ServiceCatalogItem | true | null>(null)
  const [subscriptionDrawer, setSubscriptionDrawer] = useState<CustomerSubscription | true | null>(
    null,
  )
  const [paymentCharge, setPaymentCharge] = useState<Charge | null>(null)
  const catalog = useCatalog(organization.id, view === 'catalog' || Boolean(subscriptionDrawer))
  const subscriptions = useSubscriptions(organization.id, view !== 'catalog')
  const charges = useCharges(organization.id, view === 'billing')
  const companies = useCompanies(
    organization.id,
    { archived: 'active' },
    Boolean(subscriptionDrawer),
  )
  const query = view === 'catalog' ? catalog : view === 'billing' ? charges : subscriptions
  const overdue = (charges.data ?? []).filter((charge) => charge.payment_status === 'overdue')
  const openBalances = useMemo(
    () =>
      Object.entries(
        (charges.data ?? [])
          .filter((charge) => ['due', 'overdue', 'partially_paid'].includes(charge.payment_status))
          .reduce<Record<string, number>>(
            (totals, charge) => ({
              ...totals,
              [charge.currency]: (totals[charge.currency] ?? 0) + Number(charge.outstanding_amount),
            }),
            {},
          ),
      ),
    [charges.data],
  )
  const addAction = canManage ? (
    <Button
      variant="contained"
      startIcon={<AddRounded />}
      disabled={view === 'customer-services' && !(companies.data ?? []).length}
      onClick={() => (view === 'catalog' ? setCatalogDrawer(true) : setSubscriptionDrawer(true))}
    >
      {view === 'catalog' ? t('crm.services.addCatalog') : t('crm.services.addCustomer')}
    </Button>
  ) : null

  return (
    <>
      <PageHeading
        title={
          view === 'catalog'
            ? t('crm.services.catalogTitle')
            : view === 'billing'
              ? t('crm.services.billingTitle')
              : t('crm.services.customerTitle')
        }
        description={
          view === 'catalog'
            ? t('crm.services.catalogDescription')
            : view === 'billing'
              ? t('crm.services.billingDescription')
              : t('crm.services.customerDescription')
        }
        action={view === 'billing' ? null : addAction}
      />
      {view === 'billing' ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
            <Typography color="text.secondary" variant="body2">
              {t('crm.services.activeSubscriptions')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {(subscriptions.data ?? []).filter((item) => item.status === 'active').length}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
            <Typography color="text.secondary" variant="body2">
              {t('crm.services.needsAttention')}
            </Typography>
            <Typography
              variant="h5"
              color={overdue.length ? 'error.main' : 'text.primary'}
              sx={{ mt: 0.5 }}
            >
              {t('crm.services.overdueCount', { count: overdue.length })}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
            <Typography color="text.secondary" variant="body2">
              {t('crm.services.openBalance')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {openBalances.length
                ? openBalances
                    .map(([currency, amount]) => money(amount.toFixed(2), currency))
                    .join(' · ')
                : '0.00'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('crm.services.currencyNote')}
            </Typography>
          </Paper>
        </Stack>
      ) : null}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {query.isError ? (
          <Box sx={{ p: 3 }}>
            <Failure error={query.error} retry={() => void query.refetch()} />
          </Box>
        ) : query.isPending ? (
          <Loading />
        ) : view === 'customer-services' ? (
          <SubscriptionsTable
            rows={subscriptions.data ?? []}
            canManage={canManage}
            onEdit={setSubscriptionDrawer}
            t={translate}
          />
        ) : view === 'billing' ? (
          <ChargesTable
            rows={charges.data ?? []}
            canManage={canManage}
            onPayment={setPaymentCharge}
            t={translate}
          />
        ) : (
          <CatalogTable
            rows={catalog.data ?? []}
            canManage={canManage}
            onEdit={setCatalogDrawer}
            t={translate}
          />
        )}
      </Paper>
      {catalogDrawer ? (
        <CatalogDrawer
          organizationId={organization.id}
          item={catalogDrawer === true ? undefined : catalogDrawer}
          onClose={() => setCatalogDrawer(null)}
        />
      ) : null}
      {subscriptionDrawer && (companies.error || catalog.error) ? (
        <Failure
          error={(companies.error || catalog.error)!}
          retry={() => {
            void companies.refetch()
            void catalog.refetch()
          }}
        />
      ) : null}
      {subscriptionDrawer &&
      (!companies.data || !catalog.data) &&
      !companies.error &&
      !catalog.error ? (
        <Loading />
      ) : null}
      {subscriptionDrawer && companies.data && catalog.data ? (
        <SubscriptionDrawer
          organizationId={organization.id}
          companies={companies.data}
          catalog={catalog.data}
          subscription={subscriptionDrawer === true ? undefined : subscriptionDrawer}
          onClose={() => setSubscriptionDrawer(null)}
        />
      ) : null}
      {paymentCharge ? (
        <PaymentDrawer
          organizationId={organization.id}
          charge={paymentCharge}
          onClose={() => setPaymentCharge(null)}
        />
      ) : null}
    </>
  )
}

export function CustomerServicesPage() {
  return <ServicesPage view="customer-services" />
}

export function BillingPage() {
  return <ServicesPage view="billing" />
}

export function ServiceCatalogPage() {
  return <ServicesPage view="catalog" />
}

function SubscriptionsTable({
  rows,
  canManage,
  onEdit,
  t,
}: {
  rows: CustomerSubscription[]
  canManage: boolean
  onEdit: (row: CustomerSubscription) => void
  t: Translate
}) {
  if (!rows.length)
    return (
      <Empty
        title={t('crm.services.noSubscriptions')}
        description={t('crm.services.noSubscriptionsDescription')}
      />
    )
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('crm.services.service')}</TableCell>
            <TableCell>{t('crm.services.customer')}</TableCell>
            <TableCell>{t('crm.services.cycle')}</TableCell>
            <TableCell>{t('crm.services.nextCharge')}</TableCell>
            <TableCell>{t('crm.services.status')}</TableCell>
            <TableCell align="right">{t('crm.services.amount')}</TableCell>
            {canManage ? <TableCell align="right">{t('crm.services.actions')}</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow hover key={row.id}>
              <TableCell>
                <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                {row.operational_reference ? (
                  <Typography variant="caption" color="text.secondary">
                    {row.operational_reference}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>{row.company_name}</TableCell>
              <TableCell>{intervalLabels[row.billing_interval]}</TableCell>
              <TableCell>
                {row.effective_status === 'cancelling' && row.cancellation_effective_date
                  ? `Ends ${date(row.cancellation_effective_date)}`
                  : date(row.next_billing_date)}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={
                    row.effective_status === 'cancelling'
                      ? 'Ending at period close'
                      : label(row.effective_status)
                  }
                  color={statusColors[row.effective_status]}
                />
              </TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {money(row.gross_price, row.currency)}
              </TableCell>
              {canManage ? (
                <TableCell align="right">
                  <Tooltip title="Edit subscription">
                    <IconButton aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}>
                      <EditRounded />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function ChargesTable({
  rows,
  canManage,
  onPayment,
  t,
}: {
  rows: Charge[]
  canManage: boolean
  onPayment: (row: Charge) => void
  t: Translate
}) {
  if (!rows.length)
    return (
      <Empty
        title={t('crm.services.noCharges')}
        description={t('crm.services.noChargesDescription')}
      />
    )
  const priority = {
    overdue: 0,
    partially_paid: 1,
    due: 2,
    upcoming: 3,
    paid: 4,
    waived: 5,
    cancelled: 6,
  }
  const sortedRows = [...rows].sort(
    (left, right) =>
      priority[left.payment_status] - priority[right.payment_status] ||
      left.due_date.localeCompare(right.due_date),
  )
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('crm.services.dueDate')}</TableCell>
            <TableCell>{t('crm.services.customer')}</TableCell>
            <TableCell>{t('crm.services.service')}</TableCell>
            <TableCell>{t('crm.services.status')}</TableCell>
            <TableCell align="right">{t('crm.services.gross')}</TableCell>
            <TableCell align="right">{t('crm.services.outstanding')}</TableCell>
            {canManage ? <TableCell align="right">{t('crm.services.payment')}</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow hover key={row.id}>
              <TableCell>{date(row.due_date)}</TableCell>
              <TableCell>{row.company_name}</TableCell>
              <TableCell>{row.subscription_name}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={label(row.payment_status)}
                  color={statusColors[row.payment_status]}
                />
              </TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {money(row.gross_amount, row.currency)}
              </TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                {money(row.outstanding_amount, row.currency)}
              </TableCell>
              {canManage ? (
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<PaymentsRounded />}
                    disabled={row.state !== 'open' || Number(row.outstanding_amount) === 0}
                    onClick={() => onPayment(row)}
                  >
                    {t('crm.services.record')}
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function CatalogTable({
  rows,
  canManage,
  onEdit,
  t,
}: {
  rows: ServiceCatalogItem[]
  canManage: boolean
  onEdit: (row: ServiceCatalogItem) => void
  t: Translate
}) {
  if (!rows.length)
    return (
      <Empty
        title={t('crm.services.noCatalog')}
        description={t('crm.services.noCatalogDescription')}
      />
    )
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('crm.services.service')}</TableCell>
            <TableCell>{t('crm.services.code')}</TableCell>
            <TableCell>{t('crm.services.cycle')}</TableCell>
            <TableCell>{t('crm.services.status')}</TableCell>
            <TableCell align="right">{t('crm.services.defaultPrice')}</TableCell>
            {canManage ? <TableCell align="right">{t('crm.services.actions')}</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow hover key={row.id}>
              <TableCell>
                <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                {row.description ? (
                  <Typography variant="caption" color="text.secondary">
                    {row.description}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>{row.internal_code || '—'}</TableCell>
              <TableCell>{intervalLabels[row.billing_interval]}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={row.is_active ? 'Active' : 'Inactive'}
                  color={row.is_active ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {money(row.default_net_price, row.currency)} + VAT
              </TableCell>
              {canManage ? (
                <TableCell align="right">
                  <Tooltip title="Edit catalog service">
                    <IconButton aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}>
                      <EditRounded />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
