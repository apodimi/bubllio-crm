import { describe, expect, it } from 'vitest'

import {
  customerSubscriptionContract,
  subscriptionOverviewContract,
  tokenPairContract,
  updateCenterContract,
  updateRunContract,
} from './schemas'

describe('critical API contracts', () => {
  it('normalizes a legacy custom subscription without a catalog item name', () => {
    const result = customerSubscriptionContract.parse({
      id: '00000000-0000-4000-8000-000000000701',
      organization: '00000000-0000-4000-8000-000000000702',
      company: '00000000-0000-4000-8000-000000000703',
      company_name: 'Acme',
      catalog_item: null,
      assigned_to: null,
      assigned_to_name: '',
      name: 'Custom support',
      net_price: '100.00',
      currency: 'EUR',
      tax_rate: '24.00',
      tax_amount: '24.00',
      gross_price: '124.00',
      billing_interval: 'monthly',
      start_date: '2026-10-01',
      next_billing_date: '2026-11-01',
      renewal_date: null,
      end_date: null,
      cancellation_effective_date: null,
      cancelled_at: null,
      auto_renew: true,
      status: 'active',
      effective_status: 'active',
      operational_reference: '',
      notes: '',
    })

    expect(result.catalog_item_name).toBe('')
  })

  it('rejects an incomplete authentication response', () => {
    expect(tokenPairContract.safeParse({ access: 'access-only' }).success).toBe(false)
  })

  it('rejects update-center state without connection freshness', () => {
    expect(
      updateCenterContract.safeParse({
        enabled: true,
        current_version: '1.0.0',
        latest_version: null,
        update_available: false,
        release_name: null,
        release_url: null,
        published_at: null,
        active_run: null,
        latest_run: null,
        preflight: null,
      }).success,
    ).toBe(false)
  })

  it('accepts base update runs and preserves detail freshness flags when present', () => {
    const run = {
      id: '00000000-0000-4000-8000-000000000601',
      target_version: '1.1.0',
      status: 'deploying',
      progress: 50,
      phase_label: 'Deploying',
      migration_policy: 'online_safe',
      failure_code: null,
      failure_message: null,
      requested_at: '2026-01-01T00:00:00Z',
      started_at: null,
      finished_at: null,
      updated_at: '2026-01-01T00:00:00Z',
      events: [],
    }

    expect(updateRunContract.safeParse(run).success).toBe(true)
    expect(
      updateRunContract.parse({ ...run, agent_connected: false, state_fresh: false }),
    ).toMatchObject({ agent_connected: false, state_fresh: false })
  })

  it('normalizes numeric billing totals returned by the API', () => {
    const result = subscriptionOverviewContract.parse({
      active_subscriptions: 2,
      scheduled_cancellations: 0,
      renewals_next_30_days: 1,
      overdue_charges: 1,
      open_balances: { EUR: 120.5 },
      overdue_balances: { EUR: 20 },
      collected_this_month: { EUR: 400 },
      monthly_recurring_revenue: { EUR: 99.99 },
    })

    expect(result.open_balances).toEqual({ EUR: '120.5' })
    expect(result.overdue_balances).toEqual({ EUR: '20' })
    expect(result.collected_this_month).toEqual({ EUR: '400' })
    expect(result.monthly_recurring_revenue).toEqual({ EUR: '99.99' })
  })
})
