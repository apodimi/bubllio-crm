import { expect, test } from '@playwright/test'

import { fixtureIds, login, mockApi, openAlpha } from './support/crm'

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('contact list keeps its operating view in the URL', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Open Maria Papadopoulou' })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('contacts-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('textbox', { name: 'Search contacts' }).fill('Maria')
  await expect(page).toHaveURL(/q=Maria/)

  await page.getByRole('button', { name: 'Archived' }).click()
  await expect(page).toHaveURL(/view=archived/)
  await expect(page.getByText('No matches')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Archived' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('textbox', { name: 'Search contacts' })).toHaveValue('Maria')
})

test('opens a contact profile from the clean list row', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()

  await page.getByRole('button', { name: 'Open Maria Papadopoulou' }).click()
  await expect(page).toHaveURL(new RegExp(`contact=${fixtureIds.contact}`))
  await expect(page.getByRole('heading', { name: 'Maria Papadopoulou' })).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('contact-profile.png'),
    animations: 'disabled',
  })
})

test('schedules a next action from a contact profile', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await page.getByRole('button', { name: 'Open Maria Papadopoulou' }).click()

  await page.getByRole('button', { name: 'Add next action' }).click()
  await expect(page.getByRole('heading', { name: 'Add next action' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Company' })).toContainText('Acme Ltd')
  await expect(page.getByRole('combobox', { name: 'Contact' })).toContainText('Maria Papadopoulou')
  await page.getByRole('textbox', { name: 'What needs to happen?' }).fill('Call Maria tomorrow')
  const taskRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/tasks/'),
  )
  await page.getByRole('button', { name: 'Add task' }).click()

  expect((await taskRequest).postDataJSON()).toMatchObject({
    company: fixtureIds.acmeCompany,
    contact: fixtureIds.contact,
    title: 'Call Maria tomorrow',
  })
  await expect(page.getByText('Call Maria tomorrow')).toBeVisible()
})

test('contact creation uses a company from the selected workspace', async ({ page }) => {
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.getByRole('combobox', { name: 'Company' }).click()
  await expect(page.getByRole('option', { name: 'Beta Only' })).toHaveCount(0)
  await page.getByRole('option', { name: 'Acme Ltd' }).click()
  await page.getByLabel('First name', { exact: false }).fill('Nikos')
  const sent = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/contacts/'),
  )
  await page.getByRole('button', { name: 'Create contact', exact: true }).click()
  expect((await sent).postDataJSON()).toMatchObject({
    company: fixtureIds.acmeCompany,
    first_name: 'Nikos',
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('contact list stays usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await openAlpha(page)
  await page.goto(`/organizations/${fixtureIds.alphaOrganization}/contacts`)

  await expect(page.getByRole('button', { name: 'Open Maria Papadopoulou' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
