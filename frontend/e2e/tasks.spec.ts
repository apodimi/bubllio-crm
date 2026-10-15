import { expect, test } from '@playwright/test'

import { login, mockApi, openAlpha } from './support/crm'

function task(
  id: string,
  title: string,
  dueAt: Date,
  effectiveStatus: 'open' | 'overdue' = 'open',
) {
  return {
    id,
    organization: 'alpha',
    company: 'co-a',
    company_name: 'Acme Ltd',
    contact: null,
    contact_name: '',
    deal: null,
    deal_title: '',
    assigned_to: 1,
    assigned_to_name: 'Demo User',
    created_by_name: 'Demo User',
    completed_by_name: '',
    title,
    kind: 'task',
    priority: 'normal',
    workflow_status: 'todo',
    due_at: dueAt.toISOString(),
    reminder_at: null,
    notes: '',
    effective_status: effectiveStatus,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

test('focus view keeps a busy task list scannable', async ({ page }) => {
  const now = new Date()
  const overdue = new Date(now)
  overdue.setDate(overdue.getDate() - 1)
  const today = new Date(now)
  today.setHours(Math.min(now.getHours() + 1, 23), 30, 0, 0)
  const upcoming = new Date(now)
  upcoming.setDate(upcoming.getDate() + 4)

  await mockApi(page, {
    tasks: [
      task('task-a', 'Recover overdue renewal', overdue, 'overdue'),
      task('task-b', 'Call Acme finance', today),
      task('task-c', 'Prepare quarterly review', upcoming),
    ],
  })
  await login(page)
  await openAlpha(page)
  await page.getByRole('link', { name: 'Tasks', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Overdue 1/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Today 1/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Upcoming 1/ })).toBeVisible()

  await page.getByRole('button', { name: /Overdue 1/ }).click()
  await expect(page.getByText('Recover overdue renewal')).toBeHidden()
  await page.getByRole('button', { name: /Overdue 1/ }).click()
  await expect(page.getByText('Recover overdue renewal')).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: test.info().outputPath('tasks-focus-desktop.png'),
    animations: 'disabled',
  })

  await page.getByLabel('Search tasks').fill('quarterly')
  await expect(page.getByText('Prepare quarterly review')).toBeVisible()
  await expect(page.getByText('Call Acme finance')).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel('Search tasks').fill('')
  await expect(page.getByText('Recover overdue renewal')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: test.info().outputPath('tasks-focus-mobile.png'),
    animations: 'disabled',
  })

  await page.getByRole('button', { name: 'Filters' }).click()
  await expect(page.getByRole('combobox', { name: 'Owner' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Activity' })).toBeVisible()
  await page.getByRole('button', { name: 'Filters' }).click()

  await page.getByRole('button', { name: 'Recover overdue renewal' }).click()
  await expect(page.getByRole('heading', { name: 'Recover overdue renewal' })).toBeVisible()
  await expect(page.getByText('No notes added.')).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('tasks-details-mobile.png'),
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Edit task' }).click()
  await expect(page.getByLabel('What needs to happen?')).toHaveValue('Recover overdue renewal')
  await page.getByRole('button', { name: 'Close task form' }).click()

  const statusRequest = page.waitForRequest((request) =>
    request.url().endsWith('/tasks/task-a/move/'),
  )
  await page.getByRole('combobox', { name: 'Change status for Recover overdue renewal' }).click()
  await page.getByRole('option', { name: 'In progress' }).click()
  expect((await statusRequest).postDataJSON()).toEqual({ workflow_status: 'in_progress' })
  await expect(
    page.getByRole('combobox', { name: 'Change status for Recover overdue renewal' }),
  ).toHaveText('In progress')
})
