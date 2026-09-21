import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const orgs = [
  { id: 'alpha', name: 'Alpha Studio', slug: 'alpha', current_user_role: 'owner' },
  { id: 'beta', name: 'Beta Studio', slug: 'beta', current_user_role: 'viewer' },
]
async function mockApi(page: Page) {
  const companies = [{ id: 'co-a', organization: 'alpha', name: 'Acme Ltd', email: 'hello@example.com', phone_number: '', website: '', lifecycle_stage: 'lead' }]
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/setup/' && route.request().method() === 'GET') {
      return route.fulfill({ json: { available: false } })
    }
    if (path === '/api/v1/auth/token/' && route.request().method() === 'POST') {
      return route.fulfill({ json: { access: 'access-token', refresh: 'refresh-token' } })
    }
    if (path === '/api/v1/auth/me/') {
      return route.fulfill({ json: { id: 1, username: 'demo', email: 'demo@example.com', is_superuser: false, organizations: orgs } })
    }
    if (path === '/api/v1/auth/token/refresh/') {
      return route.fulfill({ json: { access: 'access-token', refresh: 'refresh-token' } })
    }
    if (!route.request().headers().authorization) return route.fulfill({ status: 403, json: { detail: 'Authentication required' } })
    if (path === '/api/v1/organizations/') return route.fulfill({ json: orgs })
    if (path === '/api/v1/organizations/alpha/') return route.fulfill({ json: orgs[0] })
    if (path === '/api/v1/organizations/beta/') return route.fulfill({ json: orgs[1] })
    if (path === '/api/v1/organizations/alpha/companies/') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        if (body.name === 'Invalid') return route.fulfill({ status: 400, json: { name: ['Please choose another name.'] } })
        companies.push({ ...body, id: 'co-new', organization: 'alpha' })
        return route.fulfill({ status: 201, json: companies[companies.length - 1] })
      }
      return route.fulfill({ json: companies })
    }
    if (path === '/api/v1/organizations/beta/companies/') return route.fulfill({ json: [{ ...companies[0], id: 'co-b', organization: 'beta', name: 'Beta Only' }] })
    if (path === '/api/v1/organizations/alpha/contacts/' && route.request().method() === 'POST') return route.fulfill({ status: 201, json: { id: 'contact-a', ...route.request().postDataJSON() } })
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
  await expect(page.getByRole('heading', { name: 'A little more clarity.' })).toBeVisible()
}
test.beforeEach(async ({ page }) => mockApi(page))
test('login, tenant switch, permissions and logout isolate data', async ({ page }) => {
  await login(page); await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Acme Ltd' })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('companies-desktop.png'), fullPage: true })
  await page.getByRole('combobox', { name: 'Select workspace' }).click()
  await page.getByRole('option', { name: 'Beta Studio' }).click()
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Beta Only' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Acme Ltd' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add company' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])
})
test('creates company, handles validation and refreshes list', async ({ page }) => {
  await login(page); await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await page.getByRole('button', { name: 'Add company' }).click()
  await page.getByLabel('Company name', { exact: false }).fill('Invalid')
  await page.getByRole('combobox', { name: 'Stage' }).click()
  await page.getByRole('option', { name: 'Lead', exact: true }).click()
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Please choose another name.')
  await page.getByLabel('Company name', { exact: false }).fill('New partner')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'New partner' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('contact creation uses a company from the selected workspace', async ({ page }) => {
  await login(page); await openAlpha(page)
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.getByRole('combobox', { name: 'Company' }).click()
  await expect(page.getByRole('option', { name: 'Beta Only' })).toHaveCount(0)
  await page.getByRole('option', { name: 'Acme Ltd' }).click()
  await page.getByLabel('First name', { exact: false }).fill('Maria')
  const sent = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/contacts/'))
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  expect((await sent).postDataJSON()).toMatchObject({ company: 'co-a', first_name: 'Maria' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('mobile navigation works without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page); await openAlpha(page)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('contacts-mobile.png'), fullPage: true })
})
test('invalid login remains on the sign-in screen', async ({ page }) => {
  await page.route('**/api/v1/auth/token/', route => route.fulfill({ status: 401, json: { detail: 'Invalid credentials' } }))
  await page.goto('/')
  await page.getByLabel('Username').fill('bad')
  await page.getByLabel('Password').fill('bad')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
})

test('first-run setup creates an admin and then opens sign in', async ({ page }) => {
  let completed = false
  await page.route('**/api/v1/setup/', async route => {
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
  await page.goto('/')
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
})

test('setup explains invalid fields before moving to the next step', async ({ page }) => {
  await page.route('**/api/v1/setup/', route => route.fulfill({ json: { available: true } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Enter the full setup token from the server.')).toBeVisible()
  await expect(page.getByText('Admin username is required.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create your admin' })).toBeVisible()
})

test('setup sends a real SMTP test request before final confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let sent = false
  await page.route('**/api/v1/setup/', route => route.fulfill({ json: { available: true } }))
  await page.route('**/api/v1/setup/smtp-test/', route => {
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('setup-email-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Send test email' }).click()
  await expect(page.getByText('Test email sent. Check the recipient inbox.')).toBeVisible()
  expect(sent).toBe(true)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('The SMTP server accepted a test email. Check the recipient inbox to confirm delivery.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('setup-review-mobile.png'), fullPage: true })
})
