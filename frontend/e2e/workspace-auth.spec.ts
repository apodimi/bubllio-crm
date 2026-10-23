import { expect, test } from '@playwright/test'

import { fixtureIds, login, mockApi, openAlpha, orgs } from './support/crm'

test.beforeEach(async ({ page }) => mockApi(page))

test('failed page chunk reloads once and returns to sign in', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()

  const reloaded = page.waitForEvent('framenavigated')
  await page.evaluate(() => {
    setTimeout(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true })), 0)
  })
  await reloaded
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()

  const retriedAgain = await page.evaluate(() => {
    const event = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(retriedAgain).toBe(false)
})

test(
  'login, tenant switch, permissions and logout isolate data',
  { tag: '@smoke' },
  async ({ page }) => {
    const betaAssigneeRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/organizations/beta/companies/assignees/')) {
        betaAssigneeRequests.push(request.url())
      }
    })
    await login(page)
    await openAlpha(page)
    await page.getByRole('link', { name: 'Companies', exact: true }).click()
    await expect(page.getByRole('row', { name: /Open Acme Ltd/ })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('companies-desktop.png'), fullPage: true })
    await page.getByRole('button', { name: 'Select workspace' }).click()
    const activeWorkspace = page.getByRole('menuitem', { name: 'Alpha Studio' })
    await expect(activeWorkspace).toHaveAttribute('aria-current', 'page')
    await expect(activeWorkspace).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await page.getByRole('menuitem', { name: 'Beta Studio' }).click()
    await page.getByRole('link', { name: 'Companies', exact: true }).click()
    await expect(page.getByRole('row', { name: /Open Beta Only/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /Open Acme Ltd/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add company' })).toHaveCount(0)
    expect(betaAssigneeRequests).toEqual([])
    await page.getByRole('button', { name: 'Open account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['bubllio-language'])
    expect(await page.evaluate(() => sessionStorage.length)).toBe(0)
  },
)

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

test('mobile navigation works without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await openAlpha(page)
  const mobileDock = page.getByRole('navigation', { name: 'Primary navigation' })
  await mobileDock.getByRole('button', { name: 'Revenue', exact: true }).click()
  await expect(page).toHaveURL(
    `/organizations/${fixtureIds.alphaOrganization}/services/customer-services`,
  )
  await expect(
    page.getByRole('heading', {
      name: /^(Service agreements|Συμφωνίες υπηρεσιών)$/,
    }),
  ).toBeVisible()
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
  await page.screenshot({
    path: test.info().outputPath('companies-collapsed-navigation.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Expand navigation' }).click()
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Companies', {
      exact: true,
    }),
  ).toBeVisible()
})

test('stale workspace links recover before global search uses an invalid scope', async ({
  page,
}) => {
  await login(page)

  await page.goto('/organizations/00000000-0000-0000-0000-000000000000')

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('combobox', { name: /Search All workspaces/ })).toBeVisible()
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

test('authenticated language preference lives in the account menu', async ({ page }) => {
  await login(page)

  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await expect(page.getByRole('menuitem', { name: 'Account settings' })).toBeVisible()
  await page.getByRole('menuitem', { name: /Language.*English/ }).click()
  await page.getByRole('menuitemradio', { name: 'Greek' }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'el')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'el')
  await expect(page.getByRole('button', { name: 'Άνοιγμα μενού λογαριασμού' })).toBeVisible()
})

test('installation capability exposes installation settings in the account menu', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: 'installation-admin',
        email: 'admin@example.test',
        is_superuser: false,
        can_create_workspaces: true,
        organizations: orgs,
      },
    }),
  )

  await login(page)
  await openAlpha(page)
  await page.getByRole('button', { name: 'Open account menu' }).click()

  await expect(page.getByRole('menuitem', { name: 'Installation settings' })).toBeVisible()
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
      json: {
        organization_id: fixtureIds.alphaOrganization,
        role: 'viewer',
        membership_created: true,
        tokens: null,
      },
    })
  })
  await page.goto('/invite/existing-token')
  await page.getByRole('button', { name: 'I have an account' }).click()
  await page.getByLabel('Username').fill('demo')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in and join' }).click()
  await expect(page).toHaveURL(`/organizations/${fixtureIds.alphaOrganization}`)
  await expect(page.getByRole('heading', { name: 'My work' })).toBeVisible()
})
