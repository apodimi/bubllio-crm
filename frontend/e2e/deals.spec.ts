import { expect, test } from '@playwright/test'

import { fixtureIds, login, mockApi, openAlpha, orgs } from './support/crm'

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('deal board keeps search and stage filters in the URL', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Deals', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Open Annual platform renewal' })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('deals-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('textbox', { name: 'Search deals' }).fill('Annual')
  await expect(page).toHaveURL(/q=Annual/)

  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByRole('combobox', { name: 'Stage' }).click()
  await page.getByRole('option', { name: 'Proposal' }).click()
  await expect(page).toHaveURL(/stage=proposal/)

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Search deals' })).toHaveValue('Annual')
  await expect(page.getByText('Stage: Proposal')).toBeVisible()
})

test('opens an existing deal from the board', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Deals', exact: true }).click()

  await page.getByRole('button', { name: 'Open Annual platform renewal' }).click()
  await expect(page).toHaveURL(new RegExp(`deal=${fixtureIds.deal}`))
  await expect(page.getByRole('heading', { name: 'Edit deal' })).toBeVisible()
})

test('viewer can inspect a deal without mutation controls', async ({ page }) => {
  await page.route(`**/api/v1/organizations/${fixtureIds.alphaOrganization}/`, async (route) => {
    await route.fulfill({
      json: {
        ...orgs[0],
        current_user_role: 'viewer',
      },
    })
  })
  await login(page)
  await page.goto(
    `/organizations/${fixtureIds.alphaOrganization}/deals?view=no_next_action&deal=${fixtureIds.deal}`,
  )

  await expect(page.getByRole('heading', { name: 'Deal details' })).toBeVisible()
  await expect(page.getByLabel('Deal title')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add deal' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close deal form' }).click()
  await expect(page.getByRole('heading', { name: 'Deal details' })).toHaveCount(0)
})

test('starts the next action from the deal card with deal context', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Deals', exact: true }).click()

  await page.getByRole('button', { name: 'Add next action for Annual platform renewal' }).click()

  await expect(page.getByRole('heading', { name: 'Add next action' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Company' })).toHaveText('Acme Ltd')
  await expect(page.getByRole('combobox', { name: 'Deal' })).toHaveText('Annual platform renewal')
})

test('creates a deal for a company in the selected workspace', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Deals', exact: true }).click()
  await page.getByRole('button', { name: 'Add deal' }).click()

  await page.getByLabel('Deal title').fill('Implementation project')
  await page.getByRole('combobox', { name: 'Company' }).click()
  await page.getByRole('option', { name: 'Acme Ltd' }).click()
  await page.getByRole('spinbutton', { name: 'Amount' }).fill('4500')
  const sent = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/deals/'),
  )
  await page.getByRole('button', { name: 'Create deal', exact: true }).click()
  expect((await sent).postDataJSON()).toMatchObject({
    company: fixtureIds.acmeCompany,
    title: 'Implementation project',
    value: '4500',
  })
  await expect(page.getByRole('heading', { name: 'Add deal' })).toHaveCount(0)
})

test('deal board contains horizontal scrolling on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await openAlpha(page)
  const mobileDock = page.getByRole('navigation', { name: 'Primary navigation' })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Deals', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Sales pipeline' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(mobileDock).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('deals-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  })
})
