import { expect, test } from '@playwright/test'

import { login, mockApi, openAlpha } from './support/crm'

test.beforeEach(async ({ page }) => mockApi(page))

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
    company: 'co-a',
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
  await page.route('**/api/v1/organizations/alpha/contacts/contact-a/', (route) =>
    route.fulfill({
      json: {
        id: 'contact-a',
        organization: 'alpha',
        company: 'co-a',
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
  await page.route('**/api/v1/organizations/alpha/deals/deal-a/', (route) =>
    route.fulfill({
      json: {
        id: 'deal-a',
        organization: 'alpha',
        company: 'co-a',
        company_name: 'Acme Ltd',
        contact: 'contact-a',
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
            id: 'contact-a',
            display_name: 'Ada Lovelace',
            organization: { id: 'alpha', name: 'Alpha Studio' },
            company: { id: 'co-a', name: 'Acme Ltd' },
            job_title: 'Director',
          },
          {
            type: 'deal',
            id: 'deal-a',
            display_name: 'Renewal opportunity',
            organization: { id: 'alpha', name: 'Alpha Studio' },
            company: { id: 'co-a', name: 'Acme Ltd' },
            stage: 'proposal',
            value: '1000.00',
            currency: 'EUR',
          },
          {
            type: 'company',
            id: 'co-a',
            display_name: 'Acme Ltd',
            organization: { id: 'alpha', name: 'Alpha Studio' },
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
  await expect(page).toHaveURL('/organizations/alpha/contacts?contact=contact-a')
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
  await expect(page).toHaveURL('/organizations/alpha/deals?deal=deal-a')
  await expect(page.getByRole('heading', { name: 'Edit deal' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Deal title' })).toHaveValue('Renewal opportunity')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Edit deal' })).toHaveCount(0)

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
  await expect.poll(() => scopes.at(-1)).toBe('alpha')
  await page.getByRole('button', { name: 'All workspaces' }).click()
  await expect.poll(() => scopes.at(-1)).toBe(null)
})
