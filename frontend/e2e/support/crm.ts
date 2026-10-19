import { expect, type Page } from '@playwright/test'

export const fixtureIds = {
  alphaOrganization: '00000000-0000-4000-8000-000000000001',
  betaOrganization: '00000000-0000-4000-8000-000000000002',
  acmeCompany: '00000000-0000-4000-8000-000000000101',
  northwindCompany: '00000000-0000-4000-8000-000000000102',
  subscription: '00000000-0000-4000-8000-000000000201',
  contact: '00000000-0000-4000-8000-000000000301',
  deal: '00000000-0000-4000-8000-000000000401',
  task: '00000000-0000-4000-8000-000000000501',
} as const

export const orgs = [
  {
    id: fixtureIds.alphaOrganization,
    name: 'Alpha Studio',
    slug: 'alpha',
    is_personal: false,
    current_user_role: 'owner',
  },
  {
    id: fixtureIds.betaOrganization,
    name: 'Beta Studio',
    slug: 'beta',
    is_personal: false,
    current_user_role: 'viewer',
  },
]
export async function mockApi(
  page: Page,
  options: { tasks?: Array<Record<string, unknown>> } = {},
) {
  const tasks: Array<Record<string, unknown>> = [...(options.tasks ?? [])]
  let lastCompletedTask: Record<string, unknown> | null = null
  const timelineEvents = [
    {
      id: 'timeline-company-created',
      category: 'company',
      event_type: 'company.created',
      source_type: 'company',
      source_id: 'co-a',
      actor_name: 'Demo User',
      body: '',
      details: {},
      occurred_at: '2030-01-01T09:00:00Z',
    },
  ]
  const subscriptions = [
    {
      id: fixtureIds.subscription,
      organization: fixtureIds.alphaOrganization,
      company: fixtureIds.acmeCompany,
      company_name: 'Acme Ltd',
      catalog_item: null,
      catalog_item_name: '',
      assigned_to: null,
      assigned_to_name: '',
      name: 'Managed service',
      net_price: '100.00',
      currency: 'EUR',
      tax_rate: '24.00',
      tax_amount: '24.00',
      gross_price: '124.00',
      billing_interval: 'monthly',
      start_date: '2030-01-01',
      next_billing_date: '2030-02-01',
      renewal_date: null,
      end_date: null,
      cancellation_effective_date: null as string | null,
      cancelled_at: null as string | null,
      auto_renew: true,
      status: 'active',
      effective_status: 'active',
      operational_reference: '',
      notes: '',
    },
  ]
  const companies = [
    {
      id: fixtureIds.acmeCompany,
      organization: fixtureIds.alphaOrganization,
      customer_code: 'CUS-00001',
      assigned_to: 1,
      assigned_to_name: 'Demo User',
      name: 'Acme Ltd',
      tax_id: '',
      industry: 'Technology',
      email: 'hello@example.com',
      phone_number: '',
      website: '',
      address_line_1: '',
      address_line_2: '',
      city: 'Athens',
      postal_code: '',
      country: 'GR',
      notes: '',
      lifecycle_stage: 'lead',
      archived_at: null,
      created_at: '2030-01-01T00:00:00Z',
      updated_at: '2030-01-01T00:00:00Z',
    },
    {
      id: fixtureIds.northwindCompany,
      organization: fixtureIds.alphaOrganization,
      customer_code: 'CUS-00002',
      assigned_to: null,
      assigned_to_name: '',
      name: 'Northwind Works',
      tax_id: 'EL099999999',
      industry: 'Logistics',
      email: 'team@northwind.example',
      phone_number: '',
      website: '',
      address_line_1: '',
      address_line_2: '',
      city: 'Thessaloniki',
      postal_code: '',
      country: 'GR',
      notes: '',
      lifecycle_stage: 'customer',
      archived_at: null,
      created_at: '2030-01-02T00:00:00Z',
      updated_at: '2030-01-03T00:00:00Z',
    },
  ]
  const contacts = [
    {
      id: fixtureIds.contact,
      organization: fixtureIds.alphaOrganization,
      company: fixtureIds.acmeCompany,
      company_name: 'Acme Ltd',
      assigned_to: 1,
      assigned_to_name: 'Demo User',
      first_name: 'Maria',
      last_name: 'Papadopoulou',
      email: 'maria@example.com',
      phone_number: '+30 210 000 0000',
      department: 'Operations',
      job_title: 'Operations Director',
      status: 'active',
      is_primary: true,
      archived_at: null as string | null,
      created_at: '2030-01-01T00:00:00Z',
      updated_at: '2030-01-03T00:00:00Z',
    },
  ]
  const deals = [
    {
      id: fixtureIds.deal,
      organization: fixtureIds.alphaOrganization,
      company: fixtureIds.acmeCompany,
      company_name: 'Acme Ltd',
      contact: fixtureIds.contact,
      contact_name: 'Maria Papadopoulou',
      assigned_to: 1,
      assigned_to_name: 'Demo User',
      title: 'Annual platform renewal',
      value: '12000.00',
      currency: 'EUR',
      tax_rate: '24.00',
      amount_includes_tax: false,
      net_value: '12000.00',
      tax_value: '2880.00',
      gross_value: '14880.00',
      probability: 65,
      stage: 'proposal',
      sort_order: 0,
      expected_close_date: '2030-02-15',
      lost_reason: '',
      notes: '',
      archived_at: null as string | null,
      created_at: '2030-01-01T00:00:00Z',
      updated_at: '2030-01-03T00:00:00Z',
    },
  ]
  const invitations = [
    {
      id: 'invite-overview',
      email: 'new.member@example.com',
      role: 'member',
      status: 'pending',
      invited_by: 'Demo User',
      created_at: '2030-01-01T00:00:00Z',
      expires_at: '2030-01-08T00:00:00Z',
      accepted_at: null,
      revoked_at: null,
    },
  ]
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
      .replace(`/organizations/${fixtureIds.alphaOrganization}/`, '/organizations/alpha/')
      .replace(`/organizations/${fixtureIds.betaOrganization}/`, '/organizations/beta/')
      .replace(`/subscriptions/${fixtureIds.subscription}/`, '/subscriptions/sub-a/')
      .replace(`/tasks/${fixtureIds.task}/`, '/tasks/task-a/')
    if (path === '/api/v1/setup/' && route.request().method() === 'GET') {
      return route.fulfill({ json: { available: false } })
    }
    if (path === '/api/v1/auth/token/' && route.request().method() === 'POST') {
      return route.fulfill({ json: { access: 'access-token', refresh: 'refresh-token' } })
    }
    if (path === '/api/v1/auth/me/') {
      return route.fulfill({
        json: {
          id: 1,
          username: 'demo',
          email: 'demo@example.com',
          is_superuser: false,
          can_create_workspaces: false,
          organizations: orgs,
        },
      })
    }
    if (path === '/api/v1/auth/token/refresh/') {
      return route.fulfill({ json: { access: 'access-token', refresh: 'refresh-token' } })
    }
    if (!route.request().headers().authorization)
      return route.fulfill({ status: 403, json: { detail: 'Authentication required' } })
    if (path === '/api/v1/organizations/') return route.fulfill({ json: orgs })
    if (path === '/api/v1/organizations/alpha/') return route.fulfill({ json: orgs[0] })
    if (path === '/api/v1/organizations/beta/') return route.fulfill({ json: orgs[1] })
    if (path === '/api/v1/organizations/alpha/companies/') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        if (body.name === 'Invalid')
          return route.fulfill({ status: 400, json: { name: ['Please choose another name.'] } })
        companies.push({
          ...body,
          id: 'co-new',
          organization: 'alpha',
          customer_code: 'CUS-00003',
          assigned_to_name: body.assigned_to ? 'Demo User' : '',
          archived_at: null,
          created_at: '2030-01-04T00:00:00Z',
          updated_at: '2030-01-04T00:00:00Z',
        })
        return route.fulfill({ status: 201, json: companies[companies.length - 1] })
      }
      const params = new URL(route.request().url()).searchParams
      if (params.has('page')) {
        const offset = (Number(params.get('page')) - 1) * 50
        const rows = companies.filter((item) =>
          item.name.toLowerCase().includes((params.get('search') ?? '').toLowerCase()),
        )
        return route.fulfill({
          json: { count: rows.length, results: rows.slice(offset, offset + 50) },
        })
      }
      return route.fulfill({ json: companies })
    }
    if (path === '/api/v1/organizations/alpha/companies/assignees/') {
      return route.fulfill({ json: [{ id: 1, name: 'Demo User', role: 'owner' }] })
    }
    if (path === '/api/v1/organizations/alpha/tasks/') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        const task = {
          ...body,
          id: 'task-a',
          organization: 'alpha',
          company_name: 'Acme Ltd',
          contact_name: '',
          deal_title: '',
          assigned_to_name: body.assigned_to ? 'Demo User' : '',
          created_by_name: 'Demo User',
          completed_by_name: '',
          workflow_status: 'todo',
          effective_status: 'open',
          completed_at: null,
          created_at: '2030-01-01T00:00:00Z',
          updated_at: '2030-01-01T00:00:00Z',
        }
        tasks.push(task)
        return route.fulfill({ status: 201, json: task })
      }
      return route.fulfill({ json: tasks })
    }
    if (
      path === '/api/v1/organizations/alpha/tasks/task-a/' &&
      route.request().method() === 'PATCH'
    ) {
      tasks[0] = { ...tasks[0], ...route.request().postDataJSON() }
      return route.fulfill({ json: tasks[0] })
    }
    if (path === '/api/v1/organizations/alpha/tasks/task-a/move/') {
      tasks[0] = { ...tasks[0], workflow_status: route.request().postDataJSON().workflow_status }
      return route.fulfill({ json: tasks[0] })
    }
    if (path === '/api/v1/organizations/alpha/tasks/task-a/complete/') {
      const completedTask = {
        ...tasks[0],
        workflow_status: 'completed',
        effective_status: 'completed',
        completed_at: '2030-01-01T10:00:00Z',
        completed_by_name: 'Demo User',
      }
      lastCompletedTask = completedTask
      tasks.splice(0, 1)
      return route.fulfill({ json: completedTask })
    }
    if (path === '/api/v1/organizations/alpha/tasks/task-a/reopen/' && lastCompletedTask) {
      const reopenedTask = {
        ...lastCompletedTask,
        workflow_status: 'todo',
        effective_status: 'open',
        completed_at: null,
        completed_by_name: '',
      }
      tasks.push(reopenedTask)
      lastCompletedTask = null
      return route.fulfill({ json: reopenedTask })
    }
    if (path === '/api/v1/organizations/alpha/services/overview/') {
      return route.fulfill({
        json: {
          active_subscriptions: 1,
          scheduled_cancellations: subscriptions[0].status === 'cancelling' ? 1 : 0,
          renewals_next_30_days: 0,
          overdue_charges: 1,
          open_balances: { EUR: '124.00' },
          overdue_balances: { EUR: '124.00' },
          collected_this_month: { EUR: '248.00' },
          monthly_recurring_revenue: { EUR: '100.00' },
        },
      })
    }
    if (path === '/api/v1/organizations/beta/services/overview/') {
      return route.fulfill({
        json: {
          active_subscriptions: 0,
          scheduled_cancellations: 0,
          renewals_next_30_days: 0,
          overdue_charges: 0,
          open_balances: {},
          overdue_balances: {},
          collected_this_month: {},
          monthly_recurring_revenue: {},
        },
      })
    }
    if (path === '/api/v1/organizations/alpha/services/catalog/') {
      return route.fulfill({ json: [] })
    }
    if (path === '/api/v1/organizations/alpha/services/subscriptions/') {
      return route.fulfill({ json: subscriptions })
    }
    if (path === '/api/v1/organizations/alpha/services/charges/') {
      return route.fulfill({ json: [] })
    }
    if (path === '/api/v1/organizations/alpha/invitations/') {
      return route.fulfill({ json: invitations })
    }
    if (path === '/api/v1/organizations/alpha/services/subscriptions/sub-a/end/') {
      subscriptions[0] = {
        ...subscriptions[0],
        status: 'cancelling',
        effective_status: 'cancelling',
        cancellation_effective_date: '2030-02-28',
        cancelled_at: '2030-02-01T09:00:00Z',
      }
      return route.fulfill({ json: subscriptions[0] })
    }
    if (path === '/api/v1/organizations/alpha/services/subscriptions/sub-a/resume/') {
      subscriptions[0] = {
        ...subscriptions[0],
        status: 'active',
        effective_status: 'active',
        cancellation_effective_date: null,
        cancelled_at: null,
      }
      return route.fulfill({ json: subscriptions[0] })
    }
    if (path.endsWith('/companies/summary/')) {
      return route.fulfill({
        json: {
          companies: path.includes('/alpha/') ? companies.length : 1,
          contacts: 0,
        },
      })
    }
    if (path === `/api/v1/organizations/alpha/companies/${fixtureIds.acmeCompany}/timeline/`) {
      if (route.request().method() === 'POST') {
        const event = {
          id: `timeline-note-${timelineEvents.length}`,
          category: 'note',
          event_type: 'note.added',
          source_type: 'company',
          source_id: 'co-a',
          actor_name: 'Demo User',
          body: route.request().postDataJSON().body,
          details: {},
          occurred_at: '2030-01-02T10:00:00Z',
        }
        timelineEvents.unshift(event)
        return route.fulfill({ status: 201, json: event })
      }
      const category = new URL(route.request().url()).searchParams.get('category')
      const rows = category
        ? timelineEvents.filter((event) => event.category === category)
        : timelineEvents
      return route.fulfill({ json: { count: rows.length, results: rows } })
    }
    if (path.startsWith('/api/v1/organizations/alpha/companies/')) {
      const companyId = path.split('/').at(-2)
      const index = companies.findIndex((company) => company.id === companyId)
      if (index === -1) return route.fulfill({ status: 404, json: { detail: 'Not found' } })
      if (route.request().method() === 'PATCH') {
        companies[index] = { ...companies[index], ...route.request().postDataJSON() }
        return route.fulfill({ json: companies[index] })
      }
      if (route.request().method() === 'DELETE') {
        companies.splice(index, 1)
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ json: companies[index] })
    }
    if (path === '/api/v1/organizations/beta/companies/') {
      const rows = [{ ...companies[0], id: 'co-b', organization: 'beta', name: 'Beta Only' }]
      return route.fulfill({
        json: new URL(route.request().url()).searchParams.has('page')
          ? { count: 1, results: rows }
          : rows,
      })
    }
    if (path === '/api/v1/organizations/alpha/deals/') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        const deal = {
          ...body,
          id: `deal-${deals.length + 1}`,
          organization: 'alpha',
          company_name: companies.find((item) => item.id === body.company)?.name ?? '',
          contact_name: '',
          assigned_to_name: body.assigned_to ? 'Demo User' : '',
          net_value: body.value,
          tax_value: '0.00',
          gross_value: body.value,
          sort_order: deals.filter((item) => item.stage === body.stage).length,
          archived_at: null,
          created_at: '2030-01-04T00:00:00Z',
          updated_at: '2030-01-04T00:00:00Z',
        }
        deals.push(deal)
        return route.fulfill({ status: 201, json: deal })
      }
      const params = new URL(route.request().url()).searchParams
      const search = (params.get('search') ?? '').toLowerCase()
      const archived = params.get('archived') ?? 'active'
      const stage = params.get('stage')
      const assignedTo = params.get('assigned_to')
      const nextAction = params.get('next_action')
      const expectedCloseFrom = params.get('expected_close_from')
      const expectedCloseTo = params.get('expected_close_to')
      const rows = deals.filter((deal) => {
        const matchesSearch = `${deal.title} ${deal.company_name}`.toLowerCase().includes(search)
        const matchesArchive =
          archived === 'all' ||
          (archived === 'archived' ? Boolean(deal.archived_at) : !deal.archived_at)
        const matchesOwner =
          !assignedTo || (assignedTo === 'me' ? deal.assigned_to === 1 : deal.assigned_to === null)
        const hasNextAction = tasks.some((task) => task.deal === deal.id && !task.completed_at)
        const matchesNextAction =
          !nextAction || (nextAction === 'missing' ? !hasNextAction : hasNextAction)
        const closeDate = deal.expected_close_date
        const matchesClose =
          (!expectedCloseFrom || (closeDate && closeDate >= expectedCloseFrom)) &&
          (!expectedCloseTo || (closeDate && closeDate <= expectedCloseTo))
        return (
          matchesSearch &&
          matchesArchive &&
          (!stage || deal.stage === stage) &&
          matchesOwner &&
          matchesNextAction &&
          matchesClose
        )
      })
      return route.fulfill({ json: rows })
    }
    if (path.startsWith('/api/v1/organizations/alpha/deals/')) {
      const parts = path.split('/').filter(Boolean)
      const dealId = parts[parts.indexOf('deals') + 1]
      const action = parts[parts.indexOf('deals') + 2]
      const index = deals.findIndex((deal) => deal.id === dealId)
      if (index === -1) {
        return route.fulfill({ status: 404, json: { detail: 'Not found' } })
      }
      if (action === 'move') {
        deals[index] = { ...deals[index], ...route.request().postDataJSON() }
        return route.fulfill({ json: deals[index] })
      }
      if (action === 'archive') {
        deals[index] = {
          ...deals[index],
          archived_at: deals[index].archived_at ? null : '2030-01-05T00:00:00Z',
        }
        return route.fulfill({ json: deals[index] })
      }
      if (route.request().method() === 'PATCH') {
        deals[index] = { ...deals[index], ...route.request().postDataJSON() }
        return route.fulfill({ json: deals[index] })
      }
      if (route.request().method() === 'DELETE') {
        deals.splice(index, 1)
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ json: deals[index] })
    }
    if (path === '/api/v1/organizations/alpha/contacts/' && route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      const contact = {
        ...body,
        id: `contact-${contacts.length + 1}`,
        organization: 'alpha',
        company_name: companies.find((item) => item.id === body.company)?.name ?? '',
        assigned_to_name: body.assigned_to ? 'Demo User' : '',
        archived_at: null,
        created_at: '2030-01-04T00:00:00Z',
        updated_at: '2030-01-04T00:00:00Z',
      }
      contacts.push(contact)
      return route.fulfill({ status: 201, json: contact })
    }
    if (path.endsWith('/contacts/') && new URL(route.request().url()).searchParams.has('page')) {
      const params = new URL(route.request().url()).searchParams
      const search = (params.get('search') ?? '').toLowerCase()
      const archived = params.get('archived') ?? 'all'
      const company = params.get('company')
      const rows = contacts.filter((contact) => {
        const matchesSearch = [
          contact.first_name,
          contact.last_name,
          contact.email,
          contact.job_title,
          contact.department,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search)
        const matchesArchive =
          archived === 'all' ||
          (archived === 'archived' ? Boolean(contact.archived_at) : !contact.archived_at)
        return matchesSearch && matchesArchive && (!company || contact.company === company)
      })
      return route.fulfill({ json: { count: rows.length, results: rows } })
    }
    if (path.startsWith('/api/v1/organizations/alpha/contacts/')) {
      const parts = path.split('/').filter(Boolean)
      const contactId = parts[parts.indexOf('contacts') + 1]
      const action = parts[parts.indexOf('contacts') + 2]
      const index = contacts.findIndex((contact) => contact.id === contactId)
      if (index === -1) return route.fulfill({ status: 404, json: { detail: 'Not found' } })
      if (action === 'activity') return route.fulfill({ json: [] })
      if (action === 'archive') {
        contacts[index] = { ...contacts[index], archived_at: '2030-01-05T00:00:00Z' }
        return route.fulfill({ json: contacts[index] })
      }
      if (action === 'restore') {
        contacts[index] = { ...contacts[index], archived_at: null }
        return route.fulfill({ json: contacts[index] })
      }
      if (route.request().method() === 'DELETE') {
        contacts.splice(index, 1)
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ json: contacts[index] })
    }
    return route.fulfill({ json: [] })
  })
}
export async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
}
export async function openAlpha(page: Page) {
  await page.getByRole('link', { name: /Alpha Studio.*Open workspace/ }).click()
  await expect(page.getByRole('heading', { name: 'Alpha Studio', exact: true })).toBeVisible()
}
