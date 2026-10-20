import { expect, test } from '@playwright/test'

import { fixtureIds, login, mockApi } from './support/crm'

const task = {
  id: fixtureIds.task,
  organization: fixtureIds.alphaOrganization,
  company: fixtureIds.acmeCompany,
  company_name: 'Acme Ltd',
  contact: null,
  contact_name: '',
  deal: null,
  deal_title: '',
  assigned_to: 1,
  assigned_to_name: 'Demo User',
  created_by_name: 'Demo User',
  completed_by_name: '',
  title: 'Call Acme today',
  kind: 'call',
  priority: 'high',
  workflow_status: 'todo',
  due_at: '2030-01-02T09:30:00Z',
  reminder_at: null,
  notes: '',
  effective_status: 'overdue',
  completed_at: null,
  created_at: '2030-01-01T00:00:00Z',
  updated_at: '2030-01-01T00:00:00Z',
}

const inbox = {
  count: 3,
  items: [
    {
      id: `task:${fixtureIds.task}`,
      kind: 'overdue_task',
      severity: 'critical',
      title: 'Call Acme today',
      description: 'Acme Ltd',
      entity: { type: 'task', id: fixtureIds.task },
      due_at: '2030-01-02T09:30:00Z',
      action: { kind: 'navigate', path: 'tasks' },
    },
    {
      id: `deal:${fixtureIds.deal}:next-action`,
      kind: 'deal_without_next_action',
      severity: 'warning',
      title: 'Annual platform renewal',
      description: 'Acme Ltd',
      entity: { type: 'deal', id: fixtureIds.deal },
      due_at: '2030-02-15',
      action: { kind: 'navigate', path: 'deals' },
    },
    {
      id: 'billing:overdue',
      kind: 'overdue_charges',
      severity: 'critical',
      title: 'Server label ignored by UI',
      description: '2',
      entity: { type: 'billing', id: null },
      due_at: null,
      action: { kind: 'navigate', path: 'services/billing' },
    },
  ],
}

test('desktop inbox exposes count, stable order, filters, and completion refresh', async ({
  page,
}) => {
  await mockApi(page, { tasks: [task], inbox })
  await login(page)
  await page.goto(`/organizations/${fixtureIds.alphaOrganization}`)

  await expect(page.getByRole('link', { name: 'Action inbox, 3 unresolved' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Action inbox, 3 unresolved' }).last()).toBeVisible()
  await page.getByRole('link', { name: 'Action inbox, 3 unresolved' }).first().click()
  await expect(page.getByRole('heading', { name: 'Action inbox' })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('inbox-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  })

  const rows = page.getByRole('list', { name: 'Unresolved actions' }).getByRole('listitem')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('Call Acme today')
  await expect(rows.nth(1)).toContainText('Annual platform renewal')
  await expect(rows.nth(2)).toContainText('Overdue charges')
  await expect(rows.nth(2)).not.toContainText('Server label ignored by UI')

  await page.getByRole('button', { name: 'Billing' }).click()
  await expect(rows).toHaveCount(1)
  await page.getByRole('button', { name: 'All' }).click()

  const completeRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/complete/'),
  )
  await rows.nth(0).getByRole('button', { name: 'Complete' }).click()
  await completeRequest
  await expect(rows).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Action inbox, 2 unresolved' }).last()).toBeVisible()
})

test('404 shows rolling-upgrade compatibility instead of an access error', async ({ page }) => {
  await mockApi(page, { inboxStatus: 404 })
  await login(page)
  await page.goto(`/organizations/${fixtureIds.alphaOrganization}/inbox`)

  await expect(page.getByText('Action inbox is being prepared')).toBeVisible()
  await expect(
    page.getByText('This resource is unavailable or you do not have access.'),
  ).toHaveCount(0)
})

test('real failures offer retry and recover the ledger', async ({ page }) => {
  await mockApi(page, { inbox })
  let attempts = 0
  await page.route('**/activity-inbox/', async (route) => {
    attempts += 1
    if (attempts <= 2) {
      return route.fulfill({ status: 500, json: { detail: 'Unavailable.' } })
    }
    return route.fulfill({ json: inbox })
  })
  await login(page)
  await page.goto(`/organizations/${fixtureIds.alphaOrganization}/inbox`)

  await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('list', { name: 'Unresolved actions' })).toBeVisible()
})

test('mobile reaches inbox from header without adding a sixth dock item or overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page, { inbox })
  await login(page)
  await page.goto(`/organizations/${fixtureIds.alphaOrganization}`)

  await page.getByRole('link', { name: 'Action inbox, 3 unresolved' }).last().click()
  await expect(page.getByRole('heading', { name: 'Action inbox' })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('inbox-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await expect(page.locator('.MuiBottomNavigationAction-root')).toHaveCount(5)
  await expect(page.locator('.MuiBottomNavigation-root').getByText('Action inbox')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(page.getByRole('button', { name: 'Complete' })).toHaveCSS('min-height', '44px')
})

test('billing kinds route to their matching operational area', async ({ page }) => {
  await mockApi(page, {
    inbox: {
      count: 2,
      items: [
        inbox.items[2],
        {
          id: 'billing:renewals',
          kind: 'renewals_due',
          severity: 'warning',
          title: 'Renewals in 30 days',
          description: '1',
          entity: { type: 'billing', id: null },
          due_at: '2030-02-01',
          action: { kind: 'navigate', path: 'services/customer-services' },
        },
      ],
    },
  })
  await login(page)
  await page.goto(`/organizations/${fixtureIds.alphaOrganization}/inbox`)

  const rows = page.getByRole('list', { name: 'Unresolved actions' }).getByRole('listitem')
  await rows
    .filter({ hasText: 'Renewals in the next 30 days' })
    .getByRole('button', { name: 'Open' })
    .click()
  await expect(page).toHaveURL(/\/services\/customer-services$/)

  await page.goBack()
  await rows.filter({ hasText: 'Overdue charges' }).getByRole('button', { name: 'Open' }).click()
  await expect(page).toHaveURL(/\/services\/billing$/)
})
