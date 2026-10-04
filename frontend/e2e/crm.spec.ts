import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const orgs = [
  { id: 'alpha', name: 'Alpha Studio', slug: 'alpha', current_user_role: 'owner' },
  { id: 'beta', name: 'Beta Studio', slug: 'beta', current_user_role: 'viewer' },
]
async function mockApi(page: Page) {
  const companies = [
    {
      id: 'co-a',
      organization: 'alpha',
      name: 'Acme Ltd',
      email: 'hello@example.com',
      phone_number: '',
      website: '',
      lifecycle_stage: 'lead',
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
      return route.fulfill({ json: companies })
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
    if (path === '/api/v1/organizations/beta/companies/')
      return route.fulfill({
        json: [{ ...companies[0], id: 'co-b', organization: 'beta', name: 'Beta Only' }],
      })
    if (path === '/api/v1/organizations/alpha/contacts/' && route.request().method() === 'POST')
      return route.fulfill({
        status: 201,
        json: { id: 'contact-a', ...route.request().postDataJSON() },
      })
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
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Acme Ltd', exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('companies-desktop.png'), fullPage: true })
  await page.getByRole('combobox', { name: 'Select workspace' }).click()
  await page.getByRole('option', { name: 'Beta Studio' }).click()
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Beta Only' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Acme Ltd', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add company' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])
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
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Please choose another name.')
  await page.getByLabel('Company name', { exact: false }).fill('New partner')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'New partner', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('edits and deletes a company', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()

  await page.getByRole('button', { name: 'Edit Acme Ltd' }).click()
  await page.getByLabel('Company name', { exact: false }).fill('Acme Partner')
  await page.getByRole('combobox', { name: 'Stage' }).click()
  await page.getByRole('option', { name: 'Customer', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('cell', { name: 'Acme Partner', exact: true })).toBeVisible()
  await expect(page.getByText('customer', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Delete Acme Partner' }).click()
  await expect(page.getByText(/all of its contacts will be permanently deleted/)).toBeVisible()
  await page.getByRole('button', { name: 'Delete company' }).click()
  await expect(page.getByRole('cell', { name: 'Acme Partner', exact: true })).toHaveCount(0)
  await expect(page.getByText('Your next partnership awaits')).toBeVisible()
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
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  expect((await sent).postDataJSON()).toMatchObject({ company: 'co-a', first_name: 'Maria' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
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
  await expect(page.getByLabel('SMTP hostname')).toHaveValue('smtp.example.com')
  await expect(page.getByLabel('New SMTP password')).toHaveValue('')
  await page.getByLabel('Sender display name').fill('Alpha CRM')
  await page.getByRole('button', { name: 'Save connection' }).click()
  await expect(page.getByText('Email connection saved.')).toBeVisible()
  await page.getByLabel('Test recipient').fill('owner@example.com')
  await page.getByRole('button', { name: 'Send test email' }).click()
  await expect(page.getByText(/Test email accepted by the SMTP server/)).toBeVisible()
})
test('mobile navigation works without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await openAlpha(page)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: test.info().outputPath('contacts-mobile.png'), fullPage: true })
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

test('a signed-in user keeps the session when opening /login from the address bar', async ({
  page,
}) => {
  await login(page)
  await page.goto('/login')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
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
          expires_at: '2030-01-01T00:00:00Z',
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
              expires_at: '2030-01-01T00:00:00Z',
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
  await expect(banner.getByRole('link', { name: 'View release' })).toHaveAttribute(
    'href',
    'https://github.com/apodimi/bubllio-crm/releases/tag/v0.2.0',
  )
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
  await expect(page.getByRole('heading', { name: 'A little more clarity.' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'A little more clarity.' })).toBeVisible()
})
