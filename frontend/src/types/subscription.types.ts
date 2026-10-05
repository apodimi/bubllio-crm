export type BillingInterval = 'one_off' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelling' | 'cancelled' | 'expired'

export interface ServiceCatalogItem {
  id: string
  organization: string
  name: string
  description: string
  internal_code: string
  default_net_price: string
  currency: string
  default_tax_rate: string
  billing_interval: BillingInterval
  is_active: boolean
}

export interface CustomerSubscription {
  id: string
  organization: string
  company: string
  company_name: string
  catalog_item: string | null
  catalog_item_name: string
  assigned_to: number | null
  assigned_to_name: string
  name: string
  net_price: string
  currency: string
  tax_rate: string
  tax_amount: string
  gross_price: string
  billing_interval: BillingInterval
  start_date: string
  next_billing_date: string
  renewal_date: string | null
  end_date: string | null
  cancellation_effective_date: string | null
  cancelled_at: string | null
  auto_renew: boolean
  status: SubscriptionStatus
  effective_status: SubscriptionStatus
  operational_reference: string
  notes: string
}

export interface Payment {
  id: string
  amount: string
  paid_date: string
  payment_method: string
  external_reference: string
  note: string
  recorded_by_name: string
  created_at: string
}

export interface Charge {
  id: string
  subscription: string
  subscription_name: string
  company: string
  company_name: string
  coverage_start: string
  coverage_end: string
  due_date: string
  net_amount: string
  tax_rate: string
  tax_amount: string
  gross_amount: string
  paid_amount: string
  outstanding_amount: string
  currency: string
  state: 'open' | 'waived' | 'cancelled'
  payment_status:
    'upcoming' | 'due' | 'overdue' | 'partially_paid' | 'paid' | 'waived' | 'cancelled'
  payments: Payment[]
}

export type CatalogItemInput = Omit<ServiceCatalogItem, 'id' | 'organization'>
export type SubscriptionInput = Pick<
  CustomerSubscription,
  | 'company'
  | 'catalog_item'
  | 'name'
  | 'net_price'
  | 'currency'
  | 'tax_rate'
  | 'billing_interval'
  | 'start_date'
  | 'next_billing_date'
  | 'renewal_date'
  | 'end_date'
  | 'auto_renew'
  | 'status'
  | 'operational_reference'
  | 'notes'
>
export type PaymentInput = Pick<
  Payment,
  'amount' | 'paid_date' | 'payment_method' | 'external_reference' | 'note'
>

export interface SubscriptionOverview {
  active_subscriptions: number
  scheduled_cancellations: number
  renewals_next_30_days: number
  overdue_charges: number
  open_balances: Record<string, string>
  overdue_balances: Record<string, string>
  collected_this_month: Record<string, string>
  monthly_recurring_revenue: Record<string, string>
}
