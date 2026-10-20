import { expect, test } from '@playwright/test'

import { fixtureIds, login, mockApi, openAlpha } from './support/crm'

test.beforeEach(async ({ page }) => mockApi(page))

test('dashboard avoids list downloads and catalog avoids billing requests', async ({ page }) => {
  await login(page)
  const requests: string[] = []
  page.on('request', (request) => requests.push(new URL(request.url()).pathname))
  await openAlpha(page)
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible()
  expect(requests.filter((path) => /\/(companies|contacts)\/$/.test(path))).toEqual([])
  await page.goto(`/organizations/${fixtureIds.alphaOrganization}/services/catalog`)
  await expect(page.getByRole('heading', { name: 'Service catalog', exact: true })).toBeVisible()
  expect(requests.filter((path) => /\/services\/(charges|subscriptions)\/$/.test(path))).toEqual([])
})

test('turns a customer without a next step into an actionable follow-up', async ({ page }) => {
  await login(page)
  await openAlpha(page)

  const section = page.getByRole('region', { name: 'Needs a next step' })
  await expect(section.getByText('Acme Ltd')).toBeVisible()
  await expect(section.getByText('No communication recorded yet')).toBeVisible()
  await section.getByRole('button', { name: 'Add follow-up' }).click()
  await expect(page.getByRole('heading', { name: 'Add next action' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Company' })).toContainText('Acme Ltd')
  await page.getByRole('textbox', { name: 'What needs to happen?' }).fill('Check in with Acme')
  await page.getByRole('button', { name: 'Add task' }).click()

  await expect(section.getByText('Every assigned customer has a next step.')).toBeVisible()
})

test('keeps My work usable while an older server has no attention endpoint', async ({ page }) => {
  await page.route('**/companies/attention/', (route) =>
    route.fulfill({ status: 404, json: { detail: 'Not found.' } }),
  )
  await login(page)
  await openAlpha(page)

  await expect(page.getByRole('heading', { name: 'My work' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Follow-up queue' })).toBeVisible()
  const section = page.getByRole('region', { name: 'Needs a next step' })
  await expect(section).toBeVisible()
  await expect(section.getByText('Customer suggestions are being prepared')).toBeVisible()
  await expect(
    page.getByText('This resource is unavailable or you do not have access.'),
  ).toHaveCount(0)
})

test('shows real attention service failures instead of hiding them', async ({ page }) => {
  await page.route('**/companies/attention/', (route) =>
    route.fulfill({ status: 500, json: { detail: 'Unavailable.' } }),
  )
  await login(page)
  await openAlpha(page)

  const section = page.getByRole('region', { name: 'Needs a next step' })
  await expect(section).toBeVisible()
  await expect(
    section.getByText('The server could not complete this request. Please try again.'),
  ).toBeVisible()
})

test('My work links keep saved task and deal views across reload and back', async ({ page }) => {
  await login(page)
  await openAlpha(page)

  await page.getByRole('link', { name: 'All tasks' }).click()
  await expect(page).toHaveURL(/\/tasks\?owner=me&view=focus|\/tasks\?view=focus&owner=me/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'My work' })).toBeVisible()
  await page.getByRole('link', { name: 'Open deal' }).click()
  await expect(page).toHaveURL(
    `/organizations/${fixtureIds.alphaOrganization}/deals/${fixtureIds.deal}`,
  )
  await expect(page.getByRole('heading', { name: 'Annual platform renewal' })).toBeVisible()
  await page.goBack()
  await page.getByRole('link', { name: 'View deals' }).click()
  await expect(page).toHaveURL(/\/deals\?view=no_next_action/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'No next action', pressed: true })).toBeVisible()
})

test('dashboard puts daily work first and supports completion with undo', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  const openTasks = page.getByRole('link', { name: 'Open tasks', exact: true })
  const addCompany = page.getByRole('link', { name: 'Add company', exact: true })
  await expect(openTasks).toHaveAttribute(
    'href',
    `/organizations/${fixtureIds.alphaOrganization}/tasks?create=true`,
  )
  await expect(addCompany).toHaveAttribute(
    'href',
    `/organizations/${fixtureIds.alphaOrganization}/companies?create=true`,
  )
  await openTasks.click()
  await expect(page.getByRole('heading', { name: 'Add next action' })).toBeVisible()
  await page.getByLabel('What needs to happen?').fill('Call about renewal')
  await page.getByRole('combobox', { name: 'Company' }).click()
  await page.getByRole('option', { name: 'Acme Ltd' }).click()
  await page.getByRole('combobox', { name: 'Owner' }).click()
  await page.getByRole('option', { name: 'Demo User' }).click()
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('link', { name: 'My work', exact: true }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My work')
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText('Follow-up queue')
  await expect(page.getByText('1 people are still waiting to join.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manage invitations' })).toHaveAttribute(
    'href',
    `/organizations/${fixtureIds.alphaOrganization}/members`,
  )
  await expect(page.getByRole('heading', { name: 'Follow-up queue', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Needs attention', level: 2 })).toBeVisible()
  const followUpQueueBox = await page.getByRole('region', { name: 'Follow-up queue' }).boundingBox()
  const needsAttentionBox = await page
    .getByRole('region', { name: 'Needs attention' })
    .boundingBox()
  expect(followUpQueueBox).not.toBeNull()
  expect(needsAttentionBox).not.toBeNull()
  expect(Math.abs((followUpQueueBox?.width ?? 0) - (needsAttentionBox?.width ?? 0))).toBeLessThan(2)
  await page.screenshot({
    path: test.info().outputPath('operations-board-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Actions for Call about renewal' }).click()
  await page.getByRole('menuitem', { name: 'Log communication' }).click()
  const communicationDialog = page.getByRole('dialog', { name: 'Log communication' })
  await communicationDialog.getByRole('textbox', { name: 'Outcome' }).fill('Renewal discussed')
  const communicationRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/timeline/'),
  )
  await communicationDialog.getByRole('button', { name: 'Log communication' }).click()
  expect((await communicationRequest).postDataJSON()).toMatchObject({
    kind: 'call',
    outcome: 'Renewal discussed',
  })
  await expect(page.getByText('Communication added to the customer timeline.')).toBeVisible()

  await page.getByRole('button', { name: 'Actions for Call about renewal' }).click()
  const snoozeRequest = page.waitForRequest(
    (request) => request.method() === 'PATCH' && request.url().endsWith('/tasks/task-a/'),
  )
  await page.getByRole('menuitem', { name: 'Move to tomorrow' }).click()
  expect(new Date((await snoozeRequest).postDataJSON().due_at).getTime()).toBeGreaterThan(
    Date.now(),
  )
  await expect(page.getByText(/Call about renewal moved to tomorrow/)).toBeVisible()

  await page.getByRole('checkbox', { name: 'Complete Call about renewal' }).click()
  await expect(page.getByRole('checkbox', { name: 'Complete Call about renewal' })).toHaveCount(0)
  await expect(page.getByText('Call about renewal completed.')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('checkbox', { name: 'Complete Call about renewal' })).toBeVisible()

  await page.setViewportSize({ width: 320, height: 740 })
  await page.reload()
  const focusBox = await page
    .getByRole('heading', { name: 'Follow-up queue', level: 2 })
    .boundingBox()
  const attentionBox = await page
    .getByRole('heading', { name: 'Needs attention', level: 2 })
    .boundingBox()
  const dealsBox = await page
    .getByRole('heading', { name: 'Deals to move', level: 2 })
    .boundingBox()
  expect(focusBox?.y).toBeLessThan(attentionBox?.y ?? 0)
  expect(focusBox?.y).toBeLessThan(dealsBox?.y ?? 0)
  expect(dealsBox?.y).toBeLessThan(attentionBox?.y ?? 0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: test.info().outputPath('operations-board-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  })
})

test('creates and completes a customer follow-up', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Tasks', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
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
    company: fixtureIds.acmeCompany,
    title: 'Call about renewal',
    kind: 'call',
    assigned_to: 1,
  })
  await expect(page.getByText('Call about renewal')).toBeVisible()
  await page.getByRole('button', { name: 'Board', exact: true }).click()
  await expect(page.getByText('In progress', { exact: true })).toBeVisible()
  await expect(page.getByText('Waiting', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open and edit' }).click()
  await page.getByRole('combobox', { name: 'Status' }).click()
  await page.getByRole('option', { name: 'Waiting', exact: true }).click()
  const updateRequest = page.waitForRequest(
    (request) => request.method() === 'PATCH' && request.url().endsWith('/tasks/task-a/'),
  )
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await updateRequest).postDataJSON()).toMatchObject({ workflow_status: 'waiting' })
  await page.screenshot({ path: test.info().outputPath('tasks-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: test.info().outputPath('tasks-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'List', exact: true }).click()
  const completeRequest = page.waitForRequest((request) =>
    request.url().endsWith('/tasks/task-a/complete/'),
  )
  await page.getByRole('checkbox', { name: 'Complete Call about renewal' }).click()
  await completeRequest
  await expect(page.getByText('Call about renewal')).toHaveCount(0)
})

test('global search scopes results and supports keyboard navigation', async ({ page }) => {
  const scopes: Array<string | null> = []
  await page.route('**/api/v1/organizations/*/contacts/*/', (route) =>
    route.fulfill({
      json: {
        id: fixtureIds.contact,
        organization: fixtureIds.alphaOrganization,
        company: fixtureIds.acmeCompany,
        company_name: 'Acme Ltd',
        assigned_to: 1,
        assigned_to_name: 'Demo User',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        phone_number: '',
        department: 'Leadership',
        job_title: 'Director',
        status: 'active',
        is_primary: true,
        archived_at: null,
        created_at: '2030-01-01T00:00:00Z',
        updated_at: '2030-01-01T00:00:00Z',
      },
    }),
  )
  await page.route('**/api/v1/organizations/*/deals/*/', (route) =>
    route.fulfill({
      json: {
        id: fixtureIds.deal,
        organization: fixtureIds.alphaOrganization,
        company: fixtureIds.acmeCompany,
        company_name: 'Acme Ltd',
        contact: fixtureIds.contact,
        contact_name: 'Ada Lovelace',
        assigned_to: 1,
        assigned_to_name: 'Demo User',
        title: 'Renewal opportunity',
        value: '1000.00',
        currency: 'EUR',
        tax_rate: '24.00',
        amount_includes_tax: false,
        net_value: '1000.00',
        tax_value: '240.00',
        gross_value: '1240.00',
        probability: 50,
        stage: 'proposal',
        sort_order: 0,
        expected_close_date: null,
        lost_reason: '',
        notes: '',
        archived_at: null,
        created_at: '2030-01-01T00:00:00Z',
        updated_at: '2030-01-01T00:00:00Z',
      },
    }),
  )
  await page.route('**/api/v1/search/**', (route) => {
    const params = new URL(route.request().url()).searchParams
    scopes.push(params.get('organization'))
    return route.fulfill({
      json: {
        query: params.get('q'),
        count: 3,
        page: 1,
        page_size: 20,
        results: [
          {
            type: 'contact',
            id: fixtureIds.contact,
            display_name: 'Ada Lovelace',
            organization: { id: fixtureIds.alphaOrganization, name: 'Alpha Studio' },
            company: { id: fixtureIds.acmeCompany, name: 'Acme Ltd' },
            job_title: 'Director',
          },
          {
            type: 'deal',
            id: fixtureIds.deal,
            display_name: 'Renewal opportunity',
            organization: { id: fixtureIds.alphaOrganization, name: 'Alpha Studio' },
            company: { id: fixtureIds.acmeCompany, name: 'Acme Ltd' },
            stage: 'proposal',
            value: '1000.00',
            currency: 'EUR',
          },
          {
            type: 'company',
            id: fixtureIds.acmeCompany,
            display_name: 'Acme Ltd',
            organization: { id: fixtureIds.alphaOrganization, name: 'Alpha Studio' },
            customer_code: 'CUS-00001',
            lifecycle_stage: 'lead',
          },
        ],
      },
    })
  })

  await login(page)
  await page.keyboard.press('Control+k')
  const input = page.getByRole('combobox', { name: /Search All workspaces/ })
  await input.fill('acme')
  await expect(page.getByRole('option', { name: /^Acme Ltd/ })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('global-search-all-workspaces.png'),
    animations: 'disabled',
  })
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(page).toHaveURL(
    `/organizations/${fixtureIds.alphaOrganization}/contacts?contact=${fixtureIds.contact}`,
  )
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toHaveCount(0)

  await page.keyboard.press('Control+k')
  const dealSearch = page.getByRole('combobox', { name: /Search All workspaces/ })
  await dealSearch.fill('renewal')
  await expect(page.getByRole('option', { name: /^Renewal opportunity/ })).toBeVisible()
  await dealSearch.press('ArrowDown')
  await dealSearch.press('ArrowDown')
  await dealSearch.press('Enter')
  await expect(page).toHaveURL(
    `/organizations/${fixtureIds.alphaOrganization}/deals/${fixtureIds.deal}`,
  )
  await expect(page.getByRole('heading', { name: 'Renewal opportunity' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Renewal opportunity' })).toHaveCount(0)

  await page.setViewportSize({ width: 360, height: 740 })
  await openAlpha(page)
  await page.keyboard.press('Control+k')
  const scopeGroup = page.getByRole('group', { name: 'Search scope' })
  const scopeButtons = scopeGroup.getByRole('button')
  const scopeBox = await scopeGroup.boundingBox()
  const currentScopeBox = await scopeButtons.nth(0).boundingBox()
  const allScopeBox = await scopeButtons.nth(1).boundingBox()
  expect(scopeBox).not.toBeNull()
  expect(currentScopeBox).not.toBeNull()
  expect(allScopeBox).not.toBeNull()
  expect(Math.abs((currentScopeBox?.width ?? 0) - (allScopeBox?.width ?? 0))).toBeLessThanOrEqual(1)
  expect((allScopeBox?.x ?? 0) + (allScopeBox?.width ?? 0)).toBeLessThanOrEqual(
    (scopeBox?.x ?? 0) + (scopeBox?.width ?? 0),
  )
  await expect(page.getByRole('button', { name: /Current · Alpha Studio/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('combobox', { name: /Search Alpha Studio/ }).fill('ada')
  await expect.poll(() => scopes.at(-1)).toBe(fixtureIds.alphaOrganization)
  await page.getByRole('button', { name: 'All workspaces' }).click()
  await expect.poll(() => scopes.at(-1)).toBe(null)
})
