import { useMemo, useState } from 'react'
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
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

type View = 'subscriptions' | 'charges' | 'catalog'
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

export function ServicesPage() {
  const organization = useWorkspace()
  const catalog = useCatalog(organization.id)
  const subscriptions = useSubscriptions(organization.id)
  const charges = useCharges(organization.id)
  const companies = useCompanies(organization.id, { archived: 'active' })
  const canManage = canCreateRecords(organization)
  const [view, setView] = useState<View>('subscriptions')
  const [catalogDrawer, setCatalogDrawer] = useState<ServiceCatalogItem | true | null>(null)
  const [subscriptionDrawer, setSubscriptionDrawer] = useState<CustomerSubscription | true | null>(
    null,
  )
  const [paymentCharge, setPaymentCharge] = useState<Charge | null>(null)
  const query = view === 'catalog' ? catalog : view === 'charges' ? charges : subscriptions
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
      disabled={view === 'subscriptions' && !(companies.data ?? []).length}
      onClick={() => (view === 'catalog' ? setCatalogDrawer(true) : setSubscriptionDrawer(true))}
    >
      {view === 'catalog' ? 'Add catalog service' : 'Add subscription'}
    </Button>
  ) : null

  return (
    <>
      <PageHeading
        title="Services & billing"
        description="Track active customer services, renewals, charges, and incoming payments."
        action={view === 'charges' ? null : addAction}
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
          <Typography color="text.secondary" variant="body2">
            Active subscriptions
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            {(subscriptions.data ?? []).filter((item) => item.status === 'active').length}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
          <Typography color="text.secondary" variant="body2">
            Needs attention
          </Typography>
          <Typography
            variant="h5"
            color={overdue.length ? 'error.main' : 'text.primary'}
            sx={{ mt: 0.5 }}
          >
            {overdue.length} overdue
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
          <Typography color="text.secondary" variant="body2">
            Open balance
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            {openBalances.length
              ? openBalances
                  .map(([currency, amount]) => money(amount.toFixed(2), currency))
                  .join(' · ')
              : '0.00'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Each currency is shown separately.
          </Typography>
        </Paper>
      </Stack>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Tabs
          value={view}
          onChange={(_, value: View) => setView(value)}
          aria-label="Services sections"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="subscriptions" label="Customer subscriptions" />
          <Tab value="charges" label="Charges" />
          <Tab value="catalog" label="Catalog" />
        </Tabs>
        {query.isError ? (
          <Box sx={{ p: 3 }}>
            <Failure error={query.error} retry={() => void query.refetch()} />
          </Box>
        ) : query.isPending ? (
          <Loading />
        ) : view === 'subscriptions' ? (
          <SubscriptionsTable
            rows={subscriptions.data ?? []}
            canManage={canManage}
            onEdit={setSubscriptionDrawer}
          />
        ) : view === 'charges' ? (
          <ChargesTable
            rows={charges.data ?? []}
            canManage={canManage}
            onPayment={setPaymentCharge}
          />
        ) : (
          <CatalogTable rows={catalog.data ?? []} canManage={canManage} onEdit={setCatalogDrawer} />
        )}
      </Paper>
      {catalogDrawer ? (
        <CatalogDrawer
          organizationId={organization.id}
          item={catalogDrawer === true ? undefined : catalogDrawer}
          onClose={() => setCatalogDrawer(null)}
        />
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

function SubscriptionsTable({
  rows,
  canManage,
  onEdit,
}: {
  rows: CustomerSubscription[]
  canManage: boolean
  onEdit: (row: CustomerSubscription) => void
}) {
  if (!rows.length)
    return (
      <Empty
        title="No customer subscriptions yet"
        description="Add the first service agreement to start tracking charges and renewals."
      />
    )
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Service</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Cycle</TableCell>
            <TableCell>Next charge</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Amount</TableCell>
            {canManage ? <TableCell align="right">Actions</TableCell> : null}
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
}: {
  rows: Charge[]
  canManage: boolean
  onPayment: (row: Charge) => void
}) {
  if (!rows.length)
    return (
      <Empty
        title="No charges yet"
        description="A charge is created when you add a customer subscription."
      />
    )
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Due date</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Service</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Gross</TableCell>
            <TableCell align="right">Outstanding</TableCell>
            {canManage ? <TableCell align="right">Payment</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
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
                    Record
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
}: {
  rows: ServiceCatalogItem[]
  canManage: boolean
  onEdit: (row: ServiceCatalogItem) => void
}) {
  if (!rows.length)
    return (
      <Empty
        title="Build your service catalog"
        description="Create reusable services with standard pricing, VAT, and billing cycles."
      />
    )
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Service</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Cycle</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Default price</TableCell>
            {canManage ? <TableCell align="right">Actions</TableCell> : null}
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
