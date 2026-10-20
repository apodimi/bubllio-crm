import { expect, test } from '@playwright/test'

import { fixtureIds, login, mockApi, openAlpha } from './support/crm'

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('creates a collaborator rate and uses its snapshotted cost on a deal', async ({ page }) => {
  const collaborators: Array<Record<string, unknown>> = []
  const services: Array<Record<string, unknown>> = []
  const costs: Array<Record<string, unknown>> = []

  await page.route('**/api/v1/organizations/*/costing/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname.endsWith('/costing/collaborators/')) {
      if (method === 'POST') {
        const collaborator = {
          ...route.request().postDataJSON(),
          id: 'collaborator-kostas',
          organization: fixtureIds.alphaOrganization,
        }
        collaborators.push(collaborator)
        return route.fulfill({ status: 201, json: collaborator })
      }
      return route.fulfill({ json: collaborators })
    }
    if (url.pathname.endsWith('/costing/collaborator-services/')) {
      if (method === 'POST') {
        const service = {
          ...route.request().postDataJSON(),
          id: 'service-logo',
          collaborator_name: 'Kostas',
        }
        services.push(service)
        return route.fulfill({ status: 201, json: service })
      }
      const collaborator = url.searchParams.get('collaborator')
      return route.fulfill({
        json: services.filter((service) => !collaborator || service.collaborator === collaborator),
      })
    }
    return route.fallback()
  })

  await page.route('**/api/v1/organizations/*/deals/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/profitability/')) {
      const total = costs.reduce((sum, cost) => sum + Number(cost.total_cost), 0)
      return route.fulfill({
        json: {
          deal: fixtureIds.deal,
          currency: 'EUR',
          net_revenue: '12000.00',
          estimated_cost_total: total.toFixed(2),
          committed_cost_total: total.toFixed(2),
          estimated_gross_profit: (12000 - total).toFixed(2),
          estimated_margin_percent: (((12000 - total) / 12000) * 100).toFixed(2),
        },
      })
    }
    if (url.pathname.endsWith('/costs/') && route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      const cost = {
        ...body,
        id: 'cost-logo',
        deal: fixtureIds.deal,
        collaborator_name: 'Kostas',
        total_cost: (Number(body.quantity) * Number(body.unit_cost)).toFixed(2),
      }
      costs.push(cost)
      return route.fulfill({ status: 201, json: cost })
    }
    if (url.pathname.endsWith('/costs/')) {
      return route.fulfill({ json: costs })
    }
    return route.fallback()
  })

  await login(page)
  await openAlpha(page)
  await page.getByRole('button', { name: 'Revenue' }).click()
  await page.getByRole('link', { name: 'Collaborators & costs' }).click()
  await page.getByRole('button', { name: 'New collaborator' }).click()
  await page.getByLabel('Name').fill('Kostas')
  await page.getByLabel('Specialty').fill('Graphic designer')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: /Kostas/ }).click()
  await page.getByRole('button', { name: 'New service cost' }).click()
  await page.getByLabel('Service name').fill('Logo')
  await page.getByLabel('Default cost').fill('50')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('€50.00')).toBeVisible()

  await page.goto(`/organizations/${fixtureIds.alphaOrganization}/deals/${fixtureIds.deal}`)
  await page.getByRole('button', { name: 'Show costs' }).click()
  await page.getByRole('button', { name: 'Add cost' }).click()
  await page.getByRole('combobox', { name: 'Collaborator' }).click()
  await page.getByRole('option', { name: 'Kostas' }).click()
  await page.getByRole('combobox', { name: 'Catalog service' }).click()
  await page.getByRole('option', { name: 'Logo' }).click()
  await page.getByRole('combobox', { name: 'Cost status' }).click()
  await page.getByRole('option', { name: 'Committed' }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Kostas · Committed')).toBeVisible()
  await expect(page.getByText('€50.00').first()).toBeVisible()
  await expect(page.getByText('€11,950.00')).toBeVisible()
})
