import { expect, test } from '@playwright/test'

import { login, mockApi, openAlpha, orgs } from './support/crm'

test.beforeEach(async ({ page }) => mockApi(page))

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
