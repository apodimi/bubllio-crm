import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const orgs = [
  { id: 'alpha', name: 'Alpha Studio', slug: 'alpha', current_user_role: 'owner' },
  { id: 'beta', name: 'Beta Studio', slug: 'beta', current_user_role: 'viewer' },
]
async function mockApi(page: Page) {
  const tasks: Array<Record<string, unknown>> = []
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
      id: 'sub-a',
      organization: 'alpha',
      company: 'co-a',
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
      id: 'co-a',
      organization: 'alpha',
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
        companies.push({ ...body, id: 'co-new', organization: 'alpha' })
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
    if (path === '/api/v1/organizations/alpha/companies/co-a/timeline/') {
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
    if (path === '/api/v1/organizations/alpha/contacts/' && route.request().method() === 'POST')
      return route.fulfill({
        status: 201,
        json: { id: 'contact-a', ...route.request().postDataJSON() },
      })
    if (path.endsWith('/contacts/') && new URL(route.request().url()).searchParams.has('page')) {
      return route.fulfill({ json: { count: 0, results: [] } })
    }
    return route.fulfill({ json: [] })
  })
}
async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
}
async function openAlpha(page: Page) {
  await page.getByRole('link', { name: /Alpha Studio.*Open workspace/ }).click()
  await expect(page.getByRole('heading', { name: 'Alpha Studio', exact: true })).toBeVisible()
}
test.beforeEach(async ({ page }) => mockApi(page))
test('login, tenant switch, permissions and logout isolate data', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await expect(page.getByLabel('Bubllio CRM version')).toHaveText(/^Bubllio CRM v\d+\.\d+\.\d+$/)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByRole('row', { name: /Open Acme Ltd/ })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('companies-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Select workspace' }).click()
  await page.getByRole('menuitem', { name: 'Beta Studio' }).click()
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByRole('row', { name: /Open Beta Only/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Open Acme Ltd/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add company' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['bubllio-language'])
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0)
})
test('delegated creator nominates a business owner and sees the pending handoff', async ({
  page,
}) => {
  let pending: Array<{
    organization_id: string
    name: string
    slug: string
    owner_email: string
    created_at: string
  }> = []
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        id: 2,
        username: 'creator',
        email: 'creator@example.com',
        is_superuser: false,
        can_create_workspaces: true,
        organizations: [],
      },
    }),
  )
  await page.route('**/api/v1/organizations/', (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({
        name: 'Client Team',
        slug: 'client-team',
        owner_email: 'owner@example.com',
      })
      pending = [
        {
          organization_id: '00000000-0000-0000-0000-000000000001',
          name: 'Client Team',
          slug: 'client-team',
          owner_email: 'owner@example.com',
          created_at: '2030-01-01T00:00:00Z',
        },
      ]
      return route.fulfill({ status: 201, json: { ...pending[0], owner_invitation_pending: true } })
    }
    return route.fulfill({ json: [] })
  })
  await page.route('**/api/v1/organizations/provisioning/', (route) =>
    route.fulfill({ json: pending }),
  )
  await login(page)
  await page.getByRole('button', { name: 'New shared workspace' }).click()
  await page.getByLabel('Workspace name').fill('Client Team')
  await page.getByLabel('Slug', { exact: false }).fill('client-team')
  await page.getByLabel('Business owner email', { exact: false }).fill('owner@example.com')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText('Awaiting workspace owners')).toBeVisible()
  await expect(page.getByText('Owner invitation: owner@example.com')).toBeVisible()
})
test('creates company, handles validation and refreshes list', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await page.getByRole('button', { name: 'Add company' }).click()
  await page.getByLabel('Company name', { exact: false }).fill('Invalid')
  await page.getByRole('combobox', { name: 'Stage' }).click()
  await page.getByRole('option', { name: 'Lead', exact: true }).click()
  await page.getByRole('button', { name: 'Create company', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Please choose another name.')
  await page.getByLabel('Company name', { exact: false }).fill('New partner')
  await page.getByRole('button', { name: 'Create company', exact: true }).click()
  await expect(page.getByRole('row', { name: /Open New partner/ })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('closing the stage menu never flashes owner options', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()

  await page.getByRole('button', { name: 'Change stage for Acme Ltd' }).click()
  await expect(page.getByRole('menuitem', { name: 'Lead' })).toBeVisible()
  await page.evaluate(() => {
    document.body.dataset.ownerOptionFlashed = 'false'
    const observer = new MutationObserver(() => {
      const flashed = [...document.querySelectorAll('[role="menuitem"]')].some((element) =>
        element.textContent?.includes('Unassigned'),
      )
      if (flashed) document.body.dataset.ownerOptionFlashed = 'true'
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    window.setTimeout(() => observer.disconnect(), 500)
  })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(350)

  expect(await page.locator('body').getAttribute('data-owner-option-flashed')).toBe('false')
})

test('company pages reset on debounced search and render bounded rows', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  const searches: string[] = []
  await page.route('**/organizations/alpha/companies/?**', async (route) => {
    const params = new URL(route.request().url()).searchParams
    const search = params.get('search') ?? ''
    if (search) searches.push(search)
    const offset = (Number(params.get('page')) - 1) * 50
    const all = Array.from({ length: 51 }, (_, index) => ({
      id: `co-${index}`,
      customer_code: `CUS-${index}`,
      name: `Customer ${index}`,
      lifecycle_stage: 'lead',
      assigned_to: null,
    }))
    const rows = all.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()))
    await route.fulfill({ json: { count: rows.length, results: rows.slice(offset, offset + 50) } })
  })
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByText('1–50 of 51')).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('51–51 of 51')).toBeVisible()
  const search = page.getByRole('textbox', { name: /Search/ })
  await search.pressSequentially('Customer 1', { delay: 20 })
  await expect(page.getByText('1–11 of 11')).toBeVisible()
  expect(searches).toEqual(['Customer 1'])
})

test('dashboard avoids list downloads and catalog avoids billing requests', async ({ page }) => {
  await login(page)
  const requests: string[] = []
  page.on('request', (request) => requests.push(new URL(request.url()).pathname))
  await openAlpha(page)
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible()
  expect(requests.filter((path) => /\/(companies|contacts)\/$/.test(path))).toEqual([])
  await page.goto('/organizations/alpha/services/catalog')
  await expect(page.getByRole('heading', { name: 'Service catalog', exact: true })).toBeVisible()
  expect(requests.filter((path) => /\/services\/(charges|subscriptions)\/$/.test(path))).toEqual([])
})

test('dashboard puts daily work first and supports completion with undo', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  const openTasks = page.getByRole('link', { name: 'Open tasks', exact: true })
  const addCompany = page.getByRole('link', { name: 'Add company', exact: true })
  await expect(openTasks).toHaveAttribute('href', '/organizations/alpha/tasks?create=true')
  await expect(addCompany).toHaveAttribute('href', '/organizations/alpha/companies?create=true')
  await openTasks.click()
  await expect(page.getByRole('heading', { name: 'Add next action' })).toBeVisible()
  await page.getByLabel('What needs to happen?').fill('Call about renewal')
  await page.getByRole('combobox', { name: 'Company' }).click()
  await page.getByRole('option', { name: 'Acme Ltd' }).click()
  await page.getByRole('combobox', { name: 'Owner' }).click()
  await page.getByRole('option', { name: 'Demo User' }).click()
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('link', { name: 'Overview', exact: true }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Welcome back\.\s*Move one thing forward\./,
  )
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText('Next best action')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Next best action',
    'Needs attention',
    'My day',
    'Business pulse',
    'Workspace at a glance',
    'Pending invitations',
  ])
  await expect(page.getByText('1 people are still waiting to join.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manage invitations' })).toHaveAttribute(
    'href',
    '/organizations/alpha/members',
  )
  const desktopNextBox = await page
    .getByRole('heading', { name: 'Next best action', level: 2 })
    .boundingBox()
  const desktopDayBox = await page.getByRole('heading', { name: 'My day', level: 2 }).boundingBox()
  const desktopPulseBox = await page
    .getByRole('heading', { name: 'Business pulse', level: 2 })
    .boundingBox()
  expect(desktopNextBox?.y).toBeLessThan(desktopDayBox?.y ?? 0)
  expect(desktopDayBox?.y).toBeLessThan(desktopPulseBox?.y ?? 0)
  await page.screenshot({
    path: test.info().outputPath('operations-board-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('checkbox', { name: 'Complete Call about renewal' }).click()
  await expect(page.getByRole('checkbox', { name: 'Complete Call about renewal' })).toHaveCount(0)
  await expect(page.getByText('Call about renewal completed.')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('checkbox', { name: 'Complete Call about renewal' })).toBeVisible()

  await page.setViewportSize({ width: 320, height: 740 })
  await page.reload()
  const nextBox = await page
    .getByRole('heading', { name: 'Next best action', level: 2 })
    .boundingBox()
  const attentionBox = await page
    .getByRole('heading', { name: 'Needs attention', level: 2 })
    .boundingBox()
  const dayBox = await page.getByRole('heading', { name: 'My day', level: 2 }).boundingBox()
  const pulseBox = await page
    .getByRole('heading', { name: 'Business pulse', level: 2 })
    .boundingBox()
  const overviewBox = await page
    .getByRole('region', { name: 'Workspace at a glance' })
    .boundingBox()
  expect(nextBox?.y).toBeLessThan(attentionBox?.y ?? 0)
  expect(attentionBox?.y).toBeLessThan(dayBox?.y ?? 0)
  expect(dayBox?.y).toBeLessThan(pulseBox?.y ?? 0)
  expect(pulseBox?.y).toBeLessThan(overviewBox?.y ?? 0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: test.info().outputPath('operations-board-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  })
})

test('edits a company', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()

  await page.getByRole('button', { name: 'Edit Acme Ltd' }).click()
  await page.getByLabel('Company name', { exact: false }).fill('Acme Partner')
  await page.getByRole('combobox', { name: 'Stage' }).click()
  await page.getByRole('option', { name: 'Customer', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('row', { name: /Open Acme Partner/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Change stage for Acme Partner' })).toHaveText(
    'customer',
  )
})

test('adds customer context to the company timeline', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.goto('/organizations/alpha/companies/co-a')

  await expect(page.getByRole('heading', { name: 'Customer timeline' })).toBeVisible()
  await page.getByLabel('Add a note').fill('Customer approved the proposal review for Friday.')
  const noteRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/timeline/'),
  )
  await page.getByRole('button', { name: 'Add note', exact: true }).click()

  expect((await noteRequest).postDataJSON()).toEqual({
    body: 'Customer approved the proposal review for Friday.',
  })
  await expect(page.getByText('Customer approved the proposal review for Friday.')).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('customer-timeline-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Customer timeline' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: test.info().outputPath('customer-timeline-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  })
})
test('contact creation uses a company from the selected workspace', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.getByRole('combobox', { name: 'Company' }).click()
  await expect(page.getByRole('option', { name: 'Beta Only' })).toHaveCount(0)
  await page.getByRole('option', { name: 'Acme Ltd' }).click()
  await page.getByLabel('First name', { exact: false }).fill('Maria')
  const sent = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/contacts/'),
  )
  await page.getByRole('button', { name: 'Create contact', exact: true }).click()
  expect((await sent).postDataJSON()).toMatchObject({ company: 'co-a', first_name: 'Maria' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('subscription cancellation remains active through the paid period and can resume', async ({
  page,
}) => {
  await login(page)
  await openAlpha(page)
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible()
  const servicesTree = page.getByRole('tree', { name: 'Services' })
  await expect(servicesTree).toBeVisible()
  await servicesTree.getByText('Services', { exact: true }).click()
  await expect(servicesTree.getByText('Customer services', { exact: true })).toBeVisible()
  await servicesTree.getByText('Customer services', { exact: true }).click()
  await expect(page).toHaveURL('/organizations/alpha/services/customer-services')
  await expect(
    servicesTree.getByRole('treeitem', { name: 'Customer services', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.screenshot({
    path: test.info().outputPath('services-secondary-navigation.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Edit Managed service' }).click()
  await page.getByRole('button', { name: 'End customer service…' }).click()
  const cancellationRequest = page.waitForRequest((request) =>
    request.url().endsWith('/subscriptions/sub-a/end/'),
  )
  await page.getByRole('button', { name: 'End at period close' }).click()
  expect((await cancellationRequest).postDataJSON()).toEqual({ mode: 'end_of_period' })
  await expect(page.getByText('Ending at period close', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit Managed service' }).click()
  await expect(page.getByText(/Service remains active through/)).toBeVisible()
  await page.getByRole('button', { name: 'Keep active' }).click()
  await expect(page.getByText('Active', { exact: true })).toBeVisible()
})

test('creates and completes a customer follow-up', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Tasks', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tasks & follow-ups' })).toBeVisible()
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('What needs to happen?').fill('Call about renewal')
  await page.getByRole('combobox', { name: 'Activity' }).click()
  await page.getByRole('option', { name: 'Call', exact: true }).click()
  await page.getByRole('combobox', { name: 'Company' }).click()
  await page.getByRole('option', { name: 'Acme Ltd' }).click()
  await page.getByRole('combobox', { name: 'Owner' }).click()
  await page.getByRole('option', { name: 'Demo User' }).click()
  const createRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/tasks/'),
  )
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  expect((await createRequest).postDataJSON()).toMatchObject({
    company: 'co-a',
    title: 'Call about renewal',
    kind: 'call',
    assigned_to: 1,
  })
  await expect(page.getByText('Call about renewal')).toBeVisible()
  await page.getByRole('button', { name: 'Board view' }).click()
  await expect(page.getByText('In progress', { exact: true })).toBeVisible()
  await expect(page.getByText('Waiting', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open and edit' }).click()
  await page.getByRole('combobox', { name: 'Status' }).click()
  await page.getByRole('option', { name: 'Waiting', exact: true }).click()
  const moveRequest = page.waitForRequest((request) =>
    request.url().endsWith('/tasks/task-a/move/'),
  )
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await moveRequest).postDataJSON()).toEqual({ workflow_status: 'waiting' })
  await page.screenshot({ path: test.info().outputPath('tasks-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: test.info().outputPath('tasks-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'List view' }).click()
  const completeRequest = page.waitForRequest((request) =>
    request.url().endsWith('/tasks/task-a/complete/'),
  )
  await page.getByRole('checkbox', { name: 'Complete Call about renewal' }).click()
  await completeRequest
  await expect(page.getByText('Call about renewal')).toHaveCount(0)
})

test('workspace owner safely updates and tests invitation email', async ({ page }) => {
  const account = {
    id: 'smtp-a',
    name: 'Workspace SMTP',
    provider: 'smtp',
    host: 'smtp.example.com',
    port: 587,
    username: 'mailer@example.com',
    use_tls: true,
    use_ssl: false,
    from_email: 'hello@example.com',
    from_name: 'Alpha Studio',
    is_default: true,
    is_active: true,
    last_tested_at: null,
    last_test_error: '',
    created_at: '2030-01-01T00:00:00Z',
    updated_at: '2030-01-01T00:00:00Z',
  }
  await page.route('**/api/v1/organizations/alpha/settings/', (route) =>
    route.fulfill({ json: { timezone: 'UTC', locale: 'en-us', default_from_name: '' } }),
  )
  await page.route('**/api/v1/organizations/alpha/email-accounts/', (route) =>
    route.fulfill({ json: [account] }),
  )
  await page.route('**/api/v1/organizations/alpha/email-accounts/smtp-a/', (route) => {
    expect(route.request().method()).toBe('PATCH')
    expect(route.request().postDataJSON()).toMatchObject({
      host: 'smtp.example.com',
      from_name: 'Alpha CRM',
      use_tls: true,
      use_ssl: false,
    })
    expect(route.request().postDataJSON()).not.toHaveProperty('password')
    return route.fulfill({ json: { ...account, from_name: 'Alpha CRM' } })
  })
  await page.route('**/api/v1/organizations/alpha/email-accounts/smtp-a/test/', (route) => {
    expect(route.request().postDataJSON()).toEqual({ recipient: 'owner@example.com' })
    return route.fulfill({ json: { detail: 'Test email sent.', status: 'success' } })
  })

  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Email connections' }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('SMTP hostname')).toHaveValue('smtp.example.com')
  await expect(page.getByLabel('New SMTP password')).toHaveValue('')
  await page.getByLabel('Sender display name').fill('Alpha CRM')
  await page.getByRole('button', { name: 'Save connection' }).click()
  await expect(page.getByRole('heading', { name: 'Edit SMTP connection' })).toHaveCount(0)
  await page.getByLabel('Test recipient').fill('owner@example.com')
  const testRequest = page.waitForRequest((request) => request.url().endsWith('/smtp-a/test/'))
  await page.getByRole('button', { name: 'Send test', exact: true }).click()
  await testRequest
})
test('mobile navigation works without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await openAlpha(page)
  const mobileDock = page.getByRole('navigation', { name: 'Primary navigation' })
  await mobileDock.getByRole('button', { name: 'Services', exact: true }).click()
  await expect(page).toHaveURL('/organizations/alpha/services/customer-services')
  await expect(page.getByRole('heading', { name: 'Customer services', exact: true })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('navigation-mobile-dock.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.screenshot({
    path: test.info().outputPath('navigation-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: test.info().outputPath('contacts-mobile.png'), fullPage: true })
})
test('desktop navigation collapses to a usable icon rail', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('dashboard-expanded-navigation.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Companies', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible()
  await page.getByRole('button', { name: 'Expand navigation' }).click()
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Companies', {
      exact: true,
    }),
  ).toBeVisible()
})
test('invalid login remains on the sign-in screen', async ({ page }) => {
  await page.route('**/api/v1/auth/token/', (route) =>
    route.fulfill({ status: 401, json: { detail: 'Invalid credentials' } }),
  )
  await page.goto('/')
  await page.getByLabel('Username').fill('bad')
  await page.getByLabel('Password').fill('bad')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
})

test('language selection switches to Greek and persists after reload', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await page.getByRole('combobox', { name: 'Language' }).click()
  await page.getByRole('option', { name: 'Greek' }).click()
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά.' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά.' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'el')
})

test('a signed-in user keeps the session when opening /login from the address bar', async ({
  page,
}) => {
  await login(page)
  await page.goto('/login')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toHaveCount(0)
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['bubllio-language'])
  expect(await page.evaluate(() => sessionStorage.length)).toBe(1)
})

test('first-run setup creates an admin and then opens sign in', async ({ page }) => {
  let completed = false
  await page.route('**/api/v1/setup/', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { available: !completed } })
    }
    const body = route.request().postDataJSON()
    expect(body).toMatchObject({
      setup_token: 'install-token-with-at-least-32-chars',
      username: 'first-admin',
      organization_name: 'Nerds Lab',
      organization_slug: 'nerds-lab',
    })
    expect(body.smtp).toBeUndefined()
    completed = true
    return route.fulfill({ status: 201, json: { detail: 'Installation complete.' } })
  })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Create your admin' })).toBeVisible()
  await page.getByLabel('Installation setup token').fill('install-token-with-at-least-32-chars')
  await page.getByLabel('Admin username').fill('first-admin')
  await page.getByLabel('Admin email address').fill('admin@example.com')
  await page.getByLabel('Admin password').fill('a-strong-unique-password-4938')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Name your workspace' })).toBeVisible()
  await page.getByLabel('Workspace display name').fill('Nerds Lab')
  await page.getByLabel('Workspace URL slug').fill('nerds-lab')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Email settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip for now' }).click()
  await expect(page.getByRole('heading', { name: 'Ready to begin?' })).toBeVisible()
  await page.getByRole('button', { name: 'Complete setup' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await expect(page).toHaveURL('/')
  await page.getByLabel('Username').fill('first-admin')
  await page.getByLabel('Password').fill('a-strong-unique-password-4938')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
})

test('setup explains invalid fields before moving to the next step', async ({ page }) => {
  await page.route('**/api/v1/setup/', (route) => route.fulfill({ json: { available: true } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Enter the full setup token from the server.')).toBeVisible()
  await expect(page.getByText('Admin username is required.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create your admin' })).toBeVisible()
})

test('setup sends a real SMTP test request before final confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let sent = false
  await page.route('**/api/v1/setup/', (route) => route.fulfill({ json: { available: true } }))
  await page.route('**/api/v1/setup/smtp-test/', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      setup_token: 'install-token-with-at-least-32-chars',
      recipient: 'owner@example.com',
      smtp: { host: 'smtp.example.com', port: 587, username: 'mailer', password: 'smtp-secret' },
    })
    sent = true
    return route.fulfill({ json: { detail: 'Test email sent. Check the recipient inbox.' } })
  })
  await page.goto('/')
  await page.getByLabel('Installation setup token').fill('install-token-with-at-least-32-chars')
  await page.getByLabel('Admin username').fill('first-admin')
  await page.getByLabel('Admin email address').fill('admin@example.com')
  await page.getByLabel('Admin password').fill('a-strong-unique-password-4938')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Workspace display name').fill('Nerds Lab')
  await page.getByLabel('Workspace URL slug').fill('nerds-lab')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Configure an SMTP account now').check()
  await page.getByLabel('Sender email address (From)').fill('hello@example.com')
  await page.getByLabel('SMTP server hostname').fill('smtp.example.com')
  await page.getByLabel('SMTP login username').fill('mailer')
  await page.getByLabel('SMTP login password').fill('smtp-secret')
  await page.getByLabel('Test recipient email address').fill('owner@example.com')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: test.info().outputPath('setup-email-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Send test email' }).click()
  await expect(page.getByText('Test email sent. Check the recipient inbox.')).toBeVisible()
  expect(sent).toBe(true)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(
    page.getByText(
      'The SMTP server accepted a test email. Check the recipient inbox to confirm delivery.',
    ),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: test.info().outputPath('setup-review-mobile.png'), fullPage: true })
})

test('workspace owner can send an invite with a selected role', async ({ page }) => {
  let sent = false
  await page.route('**/api/v1/organizations/alpha/members/', (route) =>
    route.fulfill({
      json: [{ id: 'member-1', username: 'demo', email: 'demo@example.com', role: 'owner' }],
    }),
  )
  await page.route('**/api/v1/organizations/alpha/invitations/', (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ email: 'new@example.com', role: 'viewer' })
      sent = true
      return route.fulfill({
        status: 201,
        json: {
          id: 'invite-1',
          email: 'new@example.com',
          role: 'viewer',
          status: 'pending',
          invited_by: 'demo',
          created_at: '2029-12-25T00:00:00Z',
          expires_at: '2030-01-01T00:00:00Z',
          accepted_at: null,
          revoked_at: null,
        },
      })
    }
    return route.fulfill({
      json: sent
        ? [
            {
              id: 'invite-1',
              email: 'new@example.com',
              role: 'viewer',
              status: 'pending',
              invited_by: 'demo',
              created_at: '2029-12-25T00:00:00Z',
              expires_at: '2030-01-01T00:00:00Z',
              accepted_at: null,
              revoked_at: null,
            },
          ]
        : [],
    })
  })
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'People' }).click()
  await page.getByLabel('Email address').fill('new@example.com')
  await page.getByLabel('Role in this workspace').click()
  await page.getByRole('option', { name: 'Viewer' }).click()
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('Invitation sent to new@example.com.')).toBeVisible()
  expect(sent).toBe(true)
})

test('workspace owner sees pending invitations on the dashboard', async ({ page }) => {
  await page.route('**/api/v1/organizations/alpha/invitations/', (route) =>
    route.fulfill({
      json: [
        {
          id: 'dashboard-invite',
          email: 'waiting@example.com',
          role: 'member',
          status: 'pending',
          invited_by: 'demo',
          created_at: '2029-12-25T00:00:00Z',
          expires_at: '2030-01-01T00:00:00Z',
          accepted_at: null,
          revoked_at: null,
        },
      ],
    }),
  )

  await login(page)
  await openAlpha(page)
  await expect(page.getByRole('heading', { name: 'Pending invitations' })).toBeVisible()
  await expect(page.getByText('1 people are still waiting to join.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manage invitations' })).toHaveAttribute(
    'href',
    '/organizations/alpha/members',
  )
})

test('workspace owner can filter, resend, and revoke invitations', async ({ page }) => {
  let resent = false
  let revoked = false
  const baseInvitation = {
    email: 'pending@example.com',
    role: 'member',
    invited_by: 'demo',
    created_at: '2029-12-25T00:00:00Z',
    expires_at: '2030-01-01T00:00:00Z',
    accepted_at: null,
  }
  await page.route('**/api/v1/organizations/alpha/members/', (route) =>
    route.fulfill({
      json: [{ id: 'member-1', username: 'demo', email: 'demo@example.com', role: 'owner' }],
    }),
  )
  await page.route('**/api/v1/organizations/alpha/invitations/', (route) =>
    route.fulfill({
      json: resent
        ? [
            {
              ...baseInvitation,
              id: 'invite-2',
              status: revoked ? 'revoked' : 'pending',
              revoked_at: revoked ? '2029-12-26T00:00:00Z' : null,
            },
            {
              ...baseInvitation,
              id: 'invite-1',
              status: 'revoked',
              revoked_at: '2029-12-25T01:00:00Z',
            },
          ]
        : [
            {
              ...baseInvitation,
              id: 'invite-1',
              status: 'pending',
              revoked_at: null,
            },
          ],
    }),
  )
  await page.route('**/api/v1/organizations/alpha/invitations/invite-1/resend/', (route) => {
    resent = true
    return route.fulfill({
      status: 201,
      json: {
        ...baseInvitation,
        id: 'invite-2',
        status: 'pending',
        revoked_at: null,
      },
    })
  })
  await page.route('**/api/v1/organizations/alpha/invitations/invite-2/', (route) => {
    revoked = true
    return route.fulfill({ status: 204 })
  })

  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'People' }).click()
  await expect(page.getByRole('cell', { name: 'Pending', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Resend' }).click()
  await expect(page.getByText('A new invitation was sent to pending@example.com.')).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Revoke', exact: true }).click()
  await expect(page.getByText('Invitation for pending@example.com revoked.')).toBeVisible()
  await page.getByRole('button', { name: 'Pending (0)' }).click()
  await expect(page.getByText('No invitations match this status.')).toBeVisible()
})

test('first installation superuser can reach workspace invitations', async ({ page }) => {
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: 'first-admin',
        email: 'admin@example.com',
        is_superuser: true,
        organizations: [{ ...orgs[0], current_user_role: null }],
      },
    }),
  )
  await page.route('**/api/v1/organizations/', (route) =>
    route.fulfill({ json: [{ ...orgs[0], current_user_role: null }] }),
  )
  await page.route('**/api/v1/organizations/alpha/members/', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/v1/organizations/alpha/invitations/', (route) =>
    route.fulfill({ json: [] }),
  )
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'People' }).click()
  await expect(page.getByRole('heading', { name: 'People & invitations' })).toBeVisible()
})

test('installation admin sees a new release banner', async ({ page }) => {
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: 'first-admin',
        email: 'admin@example.com',
        is_superuser: true,
        organizations: orgs,
      },
    }),
  )
  await page.route('**/api/v1/installation/update-status/', (route) =>
    route.fulfill({
      json: {
        status: 'ok',
        enabled: true,
        current_version: '0.1.0',
        latest_version: '0.2.0',
        update_available: true,
        release_name: 'Bubllio CRM 0.2.0',
        release_url: 'https://github.com/apodimi/bubllio-crm/releases/tag/v0.2.0',
        published_at: '2026-10-04T10:00:00Z',
      },
    }),
  )

  await login(page)

  const banner = page.getByRole('alert').filter({ hasText: 'Bubllio CRM 0.2.0 is available' })
  await expect(banner).toContainText('You are running 0.1.0')
  await expect(banner.getByRole('link', { name: 'Open update center' })).toHaveAttribute(
    'href',
    '/account/settings#update-center',
  )
})

test('installation admin preflights and confirms a maintenance update', async ({
  page,
}, testInfo) => {
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: 'first-admin',
        email: 'admin@example.com',
        is_superuser: true,
        organizations: orgs,
      },
    }),
  )
  await page.route('**/api/v1/auth/me/settings/', (route) =>
    route.fulfill({
      json: {
        username: 'first-admin',
        email: 'admin@example.com',
        display_name: 'First Admin',
        first_name: 'First',
        last_name: 'Admin',
        marketing_consent: false,
      },
    }),
  )
  await page.route('**/api/v1/organizations/installation-settings/', (route) =>
    route.fulfill({
      json: { smtp: null, configured: false, allow_personal_workspaces: false },
    }),
  )
  await page.route('**/api/v1/organizations/installation-admin-invitations/', (route) =>
    route.fulfill({ json: { administrators: [], invitations: [] } }),
  )
  await page.route('**/api/v1/organizations/workspace-creators/', (route) =>
    route.fulfill({ json: [] }),
  )
  await page.route('**/api/v1/installation/production-readiness/', (route) =>
    route.fulfill({ json: { ready: true, passed: 0, total: 0, checks: [] } }),
  )
  await page.route('**/api/v1/installation/system-information/', (route) =>
    route.fulfill({
      json: {
        application_version: '0.1.0',
        python_version: '3.13.0',
        django_version: '6.0.7',
        database: 'PostgreSQL',
        email_delivery: 'Configured backend',
        debug_enabled: false,
        update_check_enabled: true,
        public_url: 'https://crm.example.com',
        runtime: 'Linux',
      },
    }),
  )
  await page.route('**/api/v1/installation/audit-log/', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/v1/installation/backup-status/', (route) =>
    route.fulfill({
      json: {
        backup: { status: 'current', completed_at: '2030-01-01T09:00:00Z' },
        restore_test: { status: 'current', completed_at: '2030-01-01T09:00:00Z' },
        backup_max_age_hours: 24,
        restore_test_max_age_days: 90,
      },
    }),
  )
  await page.route('**/api/v1/installation/updates/status/', (route) =>
    route.fulfill({
      json: {
        enabled: true,
        connected: true,
        current_version: '0.1.0',
        latest_version: '0.2.0',
        update_available: true,
        release_name: 'Bubllio CRM 0.2.0',
        release_url: 'https://github.com/apodimi/bubllio-crm/releases/tag/v0.2.0',
        published_at: '2030-01-01T08:00:00Z',
        active_run: null,
        latest_run: {
          id: 'completed-run',
          target_version: '0.1.0',
          status: 'succeeded',
          progress: 100,
          phase_label: 'Update verified',
          migration_policy: 'online_safe',
          failure_code: null,
          failure_message: null,
          requested_at: '2029-12-01T10:00:00Z',
          started_at: '2029-12-01T10:00:01Z',
          finished_at: '2029-12-01T10:02:00Z',
          updated_at: '2029-12-01T10:02:00Z',
          events: [
            {
              id: 1,
              action: 'requested',
              actor: 'first-admin',
              details: { target_version: '0.1.0', secret: 'never-render-this' },
              created_at: '2029-12-01T10:00:00Z',
            },
            {
              id: 2,
              action: 'provider_specific_event',
              actor: null,
              details: { token: 'also-never-render-this' },
              created_at: '2029-12-01T10:01:00Z',
            },
          ],
        },
        preflight: null,
      },
    }),
  )
  await page.route('**/api/v1/installation/updates/preflight/', (route) =>
    route.fulfill({
      json: {
        target_version: '0.2.0',
        eligible: true,
        migration_policy: 'maintenance',
        manifest: {
          version: '0.2.0',
        },
        checks: [
          {
            key: 'backup',
            status: 'pass',
            label: 'Recent backup verified',
            guidance: 'Backup evidence was reported by the update runner.',
          },
          {
            key: 'restore',
            status: 'warning',
            label: 'Recovery rehearsal reviewed',
            guidance: 'Schedule another recovery rehearsal after this release.',
          },
        ],
      },
    }),
  )

  await login(page)
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('menuitem', { name: 'Account settings' }).click()

  const center = page.locator('#update-center')
  await expect(center.getByRole('heading', { name: 'Update center' })).toBeVisible()
  await expect(center.getByText('0.1.0')).toBeVisible()
  await expect(center.getByText('0.2.0')).toBeVisible()
  await expect(center.getByText('Update requested')).toBeVisible()
  await expect(center.getByText('Update activity recorded')).toBeVisible()
  await expect(center).not.toContainText('never-render-this')
  await expect(center).not.toContainText('also-never-render-this')
  await center.getByRole('button', { name: 'Run safety checks' }).click()
  await expect(center.getByText('Recent backup verified')).toBeVisible()
  await expect(center.getByText('Maintenance window')).toBeVisible()
  await center.screenshot({ path: testInfo.outputPath('update-center-desktop.png') })
  await center.getByRole('button', { name: 'Review and continue' }).click()

  const dialog = page.getByRole('dialog', { name: 'Confirm update to 0.2.0' })
  const guideLink = dialog.getByRole('link', { name: 'Open maintenance guide' })
  await expect(guideLink).toHaveAttribute('aria-disabled', 'true')
  await dialog.getByLabel('Type 0.2.0 to confirm').fill('0.2.0')
  await expect(guideLink).toHaveAttribute(
    'href',
    'https://github.com/apodimi/bubllio-crm/releases/tag/v0.2.0',
  )
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await center.screenshot({ path: testInfo.outputPath('update-center-mobile.png') })
})

test('installation admin can review production readiness checks', async ({ page }) => {
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: 'first-admin',
        email: 'admin@example.com',
        is_superuser: true,
        organizations: orgs,
      },
    }),
  )
  await page.route('**/api/v1/auth/me/settings/', (route) =>
    route.fulfill({
      json: {
        username: 'first-admin',
        email: 'admin@example.com',
        display_name: 'First Admin',
        first_name: 'First',
        last_name: 'Admin',
        marketing_consent: false,
      },
    }),
  )
  await page.route('**/api/v1/organizations/installation-settings/', (route) =>
    route.fulfill({
      json: { smtp: null, configured: false, allow_personal_workspaces: false },
    }),
  )
  await page.route('**/api/v1/organizations/installation-admin-invitations/', (route) =>
    route.fulfill({ json: { administrators: [], invitations: [] } }),
  )
  await page.route('**/api/v1/organizations/workspace-creators/', (route) =>
    route.fulfill({ json: [] }),
  )
  await page.route('**/api/v1/installation/production-readiness/', (route) =>
    route.fulfill({
      json: {
        ready: false,
        passed: 9,
        total: 11,
        checks: [
          {
            key: 'debug_disabled',
            label: 'Detailed error pages are hidden',
            meaning:
              'Prevents visitors from seeing internal application details when something goes wrong.',
            status: 'pass',
            guidance: 'Set DJANGO_DEBUG=false on the server, then restart Bubllio.',
          },
          {
            key: 'secure_session_cookie',
            label: 'Sign-in cookies travel only over HTTPS',
            meaning: 'Reduces the chance that somebody can steal an active sign-in session.',
            status: 'fail',
            guidance: 'Set DJANGO_SESSION_COOKIE_SECURE=true and restart Bubllio.',
          },
        ],
      },
    }),
  )
  await page.route('**/api/v1/installation/system-information/', (route) =>
    route.fulfill({
      json: {
        application_version: '0.1.0',
        python_version: '3.13.0',
        django_version: '6.0.7',
        database: 'PostgreSQL',
        email_delivery: 'Configured backend',
        debug_enabled: false,
        update_check_enabled: true,
        public_url: 'https://crm.example.com',
        runtime: 'Linux',
      },
    }),
  )
  await page.route('**/api/v1/installation/audit-log/', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/v1/installation/backup-status/', (route) =>
    route.fulfill({
      json: {
        backup: { status: 'unknown', completed_at: null },
        restore_test: { status: 'unknown', completed_at: null },
        backup_max_age_hours: 24,
        restore_test_max_age_days: 90,
      },
    }),
  )

  await login(page)
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('menuitem', { name: 'Account settings' }).click()

  await expect(page.getByRole('heading', { name: 'Server safety checks' })).toBeVisible()
  await expect(page.getByText('9 of 11 safety checks passed')).toBeVisible()
  await expect(page.getByText('Sign-in cookies travel only over HTTPS')).toBeVisible()
  await expect(
    page.getByText('Set DJANGO_SESSION_COOKIE_SECURE=true and restart Bubllio.'),
  ).toBeVisible()
})

test('invite-only registration creates an account and opens the invited workspace', async ({
  page,
}) => {
  await page.route('**/api/v1/invitations/sample-token/', (route) =>
    route.fulfill({
      json: {
        email: 'new@example.com',
        organization_name: 'Alpha Studio',
        role: 'member',
        expires_at: '2030-01-01T00:00:00Z',
      },
    }),
  )
  await page.route('**/api/v1/invitations/sample-token/accept/', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      username: 'new-person',
      password: 'a-strong-unique-password-4938',
      display_name: 'New Person',
      first_name: '',
      last_name: '',
      date_of_birth: null,
    })
    return route.fulfill({
      status: 201,
      json: {
        organization_id: 'alpha',
        role: 'member',
        tokens: { access: 'new-access', refresh: 'new-refresh' },
      },
    })
  })
  await page.goto('/invite/sample-token')
  await expect(page.getByRole('heading', { name: 'Join Alpha Studio' })).toBeVisible()
  await page.getByLabel('Display name').fill('New Person')
  await page.getByLabel('Username').fill('new-person')
  await page.getByLabel('Password').fill('a-strong-unique-password-4938')
  await page.getByRole('button', { name: 'Create account and join' }).click()
  await expect(page).toHaveURL('/organizations/alpha')
  await expect(page.getByRole('heading', { name: /Move one thing forward/ })).toBeVisible()
})

test('existing account signs in and accepts a workspace invitation', async ({ page }) => {
  await page.route('**/api/v1/invitations/existing-token/', (route) =>
    route.fulfill({
      json: {
        email: 'demo@example.com',
        organization_name: 'Alpha Studio',
        role: 'viewer',
        expires_at: '2030-01-01T00:00:00Z',
      },
    }),
  )
  await page.route('**/api/v1/invitations/existing-token/accept/', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer access-token')
    expect(route.request().postDataJSON()).toEqual({})
    return route.fulfill({
      status: 201,
      json: { organization_id: 'alpha', role: 'viewer', tokens: null },
    })
  })
  await page.goto('/invite/existing-token')
  await page.getByRole('button', { name: 'I have an account' }).click()
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in and join' }).click()
  await expect(page).toHaveURL('/organizations/alpha')
  await expect(page.getByRole('heading', { name: /Move one thing forward/ })).toBeVisible()
})
