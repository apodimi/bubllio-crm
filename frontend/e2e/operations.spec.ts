import { expect, test } from '@playwright/test'

import { login, mockApi, openAlpha, orgs } from './support/crm'

test.beforeEach(async ({ page }) => mockApi(page))

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
  const servicesParent = servicesTree.getByRole('treeitem', { name: /^Services/ }).first()
  await expect(servicesParent).toHaveAttribute('aria-expanded', 'true')
  await servicesTree.getByText('Services', { exact: true }).click()
  await expect(servicesParent).toHaveAttribute('aria-expanded', 'false')
  await expect(servicesTree.getByText('Customer services', { exact: true })).toBeHidden()
  await expect(servicesParent.locator('[data-active-submenu-indicator="true"]')).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('services-secondary-navigation-collapsed.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await servicesTree.getByText('Services', { exact: true }).click()
  await expect(servicesParent).toHaveAttribute('aria-expanded', 'true')
  await expect(servicesTree.getByText('Customer services', { exact: true })).toBeVisible()
  await expect(servicesParent.locator('[data-active-submenu-indicator="true"]')).toHaveCount(0)
  const servicesContent = servicesParent.locator('.MuiTreeItem-content').first()
  await servicesContent.hover()
  await expect(servicesContent).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const servicesContentBox = await servicesContent.boundingBox()
  const servicesArrowBox = await servicesContent.locator('.MuiTreeItem-iconContainer').boundingBox()
  expect(servicesContentBox).not.toBeNull()
  expect(servicesArrowBox).not.toBeNull()
  expect(
    Math.abs(
      (servicesContentBox?.x ?? 0) +
        (servicesContentBox?.width ?? 0) -
        ((servicesArrowBox?.x ?? 0) + (servicesArrowBox?.width ?? 0)),
    ),
  ).toBeLessThan(14)
  await page.screenshot({
    path: test.info().outputPath('services-secondary-navigation.png'),
    fullPage: true,
    animations: 'disabled',
  })
  const billingItem = servicesTree.getByRole('treeitem', { name: 'Billing', exact: true })
  const billingContent = billingItem.locator('.MuiTreeItem-content')
  const billingLabel = billingItem.getByText('Billing', { exact: true })
  const restingColor = await billingLabel.evaluate((element) => getComputedStyle(element).color)
  await billingContent.hover()
  await expect(billingContent).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(billingLabel).toHaveCSS('color', restingColor)
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
