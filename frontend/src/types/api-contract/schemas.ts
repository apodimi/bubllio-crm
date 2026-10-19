import { z } from 'zod'

import type { Organization } from '../organization.types'
import type {
  Charge,
  CustomerSubscription,
  Payment,
  ServiceCatalogItem,
  SubscriptionOverview,
} from '../subscription.types'
import type {
  InstallationUpdateCenterStatus,
  InstallationUpdatePreflight,
  InstallationUpdateRun,
  InstallationUpdateStatus,
} from '../update.types'

const nullableString = z.string().nullable()

export const organizationContract: z.ZodType<Organization> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  is_personal: z.boolean(),
  current_user_role: z.enum(['owner', 'admin', 'member', 'viewer']).nullable(),
})

export const tokenPairContract = z.object({
  access: z.string().min(1),
  refresh: z.string().min(1),
})

export const currentUserContract = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  is_superuser: z.boolean(),
  can_create_workspaces: z.boolean(),
  organizations: z.array(organizationContract),
})

const paymentContract: z.ZodType<Payment> = z.object({
  id: z.string().uuid(),
  amount: z.string(),
  paid_date: z.string(),
  payment_method: z.string(),
  external_reference: z.string(),
  note: z.string(),
  recorded_by_name: z.string(),
  created_at: z.string(),
})

export const chargeContract: z.ZodType<Charge> = z.object({
  id: z.string().uuid(),
  subscription: z.string().uuid(),
  subscription_name: z.string(),
  company: z.string().uuid(),
  company_name: z.string(),
  coverage_start: z.string(),
  coverage_end: z.string(),
  due_date: z.string(),
  net_amount: z.string(),
  tax_rate: z.string(),
  tax_amount: z.string(),
  gross_amount: z.string(),
  paid_amount: z.string(),
  outstanding_amount: z.string(),
  currency: z.string(),
  state: z.enum(['open', 'waived', 'cancelled']),
  payment_status: z.enum([
    'upcoming',
    'due',
    'overdue',
    'partially_paid',
    'paid',
    'waived',
    'cancelled',
  ]),
  payments: z.array(paymentContract),
})

export const catalogItemContract: z.ZodType<ServiceCatalogItem> = z.object({
  id: z.string().uuid(),
  organization: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  internal_code: z.string(),
  default_net_price: z.string(),
  currency: z.string(),
  default_tax_rate: z.string(),
  billing_interval: z.enum(['one_off', 'monthly', 'quarterly', 'semiannual', 'annual']),
  is_active: z.boolean(),
})

export const customerSubscriptionContract: z.ZodType<CustomerSubscription> = z.object({
  id: z.string().uuid(),
  organization: z.string().uuid(),
  company: z.string().uuid(),
  company_name: z.string(),
  catalog_item: z.string().uuid().nullable(),
  catalog_item_name: z.string(),
  assigned_to: z.number().int().nullable(),
  assigned_to_name: z.string(),
  name: z.string(),
  net_price: z.string(),
  currency: z.string(),
  tax_rate: z.string(),
  tax_amount: z.string(),
  gross_price: z.string(),
  billing_interval: z.enum(['one_off', 'monthly', 'quarterly', 'semiannual', 'annual']),
  start_date: z.string(),
  next_billing_date: z.string(),
  renewal_date: nullableString,
  end_date: nullableString,
  cancellation_effective_date: nullableString,
  cancelled_at: nullableString,
  auto_renew: z.boolean(),
  status: z.enum(['active', 'paused', 'cancelling', 'cancelled', 'expired']),
  effective_status: z.enum(['active', 'paused', 'cancelling', 'cancelled', 'expired']),
  operational_reference: z.string(),
  notes: z.string(),
})

const decimalTotal = z.union([z.string(), z.number().finite()]).transform((value) => String(value))
const currencyTotals = z.record(decimalTotal)
type SubscriptionOverviewInput = Omit<
  SubscriptionOverview,
  'open_balances' | 'overdue_balances' | 'collected_this_month' | 'monthly_recurring_revenue'
> & {
  open_balances: Record<string, string | number>
  overdue_balances: Record<string, string | number>
  collected_this_month: Record<string, string | number>
  monthly_recurring_revenue: Record<string, string | number>
}

export const subscriptionOverviewContract: z.ZodType<
  SubscriptionOverview,
  z.ZodTypeDef,
  SubscriptionOverviewInput
> = z.object({
  active_subscriptions: z.number().int(),
  scheduled_cancellations: z.number().int(),
  renewals_next_30_days: z.number().int(),
  overdue_charges: z.number().int(),
  open_balances: currencyTotals,
  overdue_balances: currencyTotals,
  collected_this_month: currencyTotals,
  monthly_recurring_revenue: currencyTotals,
})

const migrationPolicy = z.enum(['online_safe', 'maintenance', 'irreversible'])
const runStatus = z.enum([
  'requested',
  'preflight',
  'backing_up',
  'deploying',
  'verifying',
  'succeeded',
  'failed',
  'rolled_back',
  'manual_intervention',
])
const checkContract = z.object({
  key: z.string(),
  status: z.enum(['pass', 'warning', 'fail']),
  label: z.string(),
  guidance: z.string(),
})
const runContract: z.ZodType<InstallationUpdateRun> = z.object({
  id: z.string().uuid(),
  target_version: z.string(),
  status: runStatus,
  progress: z.number(),
  phase_label: z.string(),
  migration_policy: migrationPolicy,
  failure_code: nullableString,
  failure_message: nullableString,
  requested_at: z.string(),
  started_at: nullableString,
  finished_at: nullableString,
  updated_at: z.string(),
  events: z.array(
    z.object({
      id: z.number().int(),
      action: z.string(),
      actor: nullableString,
      details: z.record(z.unknown()),
      created_at: z.string(),
    }),
  ),
  agent_connected: z.boolean().optional(),
  state_fresh: z.boolean().optional(),
})
const preflightContract: z.ZodType<InstallationUpdatePreflight> = z.object({
  target_version: z.string(),
  eligible: z.boolean(),
  checks: z.array(checkContract),
  migration_policy: migrationPolicy,
  manifest: z.object({}).passthrough(),
})

export const updateStatusContract: z.ZodType<InstallationUpdateStatus> = z.object({
  status: z.enum(['ok', 'unavailable', 'disabled']),
  enabled: z.boolean(),
  current_version: z.string(),
  latest_version: nullableString,
  update_available: z.boolean(),
  release_name: nullableString,
  release_url: nullableString,
  published_at: nullableString,
})

export const updateRunContract = runContract
export const updatePreflightContract = preflightContract
export const updateCenterContract: z.ZodType<InstallationUpdateCenterStatus> = z.object({
  enabled: z.boolean(),
  connected: z.boolean(),
  current_version: z.string(),
  latest_version: nullableString,
  update_available: z.boolean(),
  release_name: nullableString,
  release_url: nullableString,
  published_at: nullableString,
  active_run: runContract.nullable(),
  latest_run: runContract.nullable(),
  preflight: preflightContract.nullable(),
})
