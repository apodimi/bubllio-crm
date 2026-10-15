import { expect, test } from '@playwright/test'

import { login, mockApi, openAlpha } from './support/crm'

test.beforeEach(async ({ page }) => mockApi(page))

test(
  'creates company, handles validation and refreshes list',
  { tag: '@smoke' },
  async ({ page }) => {
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
  },
)

test('closing the stage menu never flashes owner options', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()

  await page.getByRole('button', { name: 'Lifecycle stage: Acme Ltd' }).click()
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
      assigned_to_name: '',
      updated_at: '2030-01-01T00:00:00Z',
      archived_at: null,
    }))
    const rows = all.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()))
    await route.fulfill({ json: { count: rows.length, results: rows.slice(offset, offset + 50) } })
  })
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page.getByText('1–50 of 51')).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('51–51 of 51')).toBeVisible()
  await expect(page).toHaveURL(/page=2/)
  const search = page.getByRole('textbox', { name: /Search/ })
  await search.pressSequentially('Customer 1', { delay: 20 })
  await expect(page.getByText('1–11 of 11')).toBeVisible()
  await expect(page).toHaveURL(/q=Customer(?:%20|\+)1/)
  expect(new URL(page.url()).searchParams.has('page')).toBe(false)
  expect(searches).toEqual(['Customer 1'])
})

test('company filters persist in the URL and survive reload', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()

  await page.getByRole('textbox', { name: 'Search companies' }).fill('Acme')
  await page.getByRole('button', { name: 'Archived', exact: true }).click()
  await page.getByRole('button', { name: /^Filters/ }).click()
  await page.getByRole('combobox', { name: 'Lifecycle stage' }).click()
  await page.getByRole('option', { name: 'Customer', exact: true }).click()
  await page.getByRole('combobox', { name: 'Sort' }).click()
  await page.getByRole('option', { name: 'Company name', exact: true }).click()

  const params = new URL(page.url()).searchParams
  expect(params.get('q')).toBe('Acme')
  expect(params.get('view')).toBe('archived')
  expect(params.get('stage')).toBe('customer')
  expect(params.get('sort')).toBe('name')

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Search companies' })).toHaveValue('Acme')
  await expect(page.getByRole('button', { name: 'Archived', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Customer', { exact: true }).first()).toBeVisible()
})

test('company mobile ledger exposes two complete summaries without nested controls', async ({
  page,
}) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()

  const companyLinks = page.getByRole('button', { name: /^Open (Acme Ltd|Northwind Works)$/ })
  await expect(companyLinks).toHaveCount(2)
  const secondSummary = await companyLinks.nth(1).boundingBox()
  expect(secondSummary?.y).toBeLessThan(844)
  expect(await companyLinks.nth(0).locator('button').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('edits a company', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Companies', exact: true }).click()

  await page.getByRole('button', { name: 'More actions for Acme Ltd' }).click()
  await page.getByRole('menuitem', { name: 'Edit company' }).click()
  await page.getByLabel('Company name', { exact: false }).fill('Acme Partner')
  await page.getByRole('combobox', { name: 'Stage' }).click()
  await page.getByRole('option', { name: 'Customer', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('row', { name: /Open Acme Partner/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lifecycle stage: Acme Partner' })).toHaveText(
    'Customer',
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
