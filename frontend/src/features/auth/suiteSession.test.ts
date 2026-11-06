import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const adapter = vi.hoisted(() => ({
  init: vi.fn(),
  updateToken: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('keycloak-js', () => ({
  default: class {
    token = 'suite-access-token'
    init = adapter.init
    updateToken = adapter.updateToken
    login = adapter.login
    logout = adapter.logout
  },
}))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_SUITE_KEYCLOAK_URL', 'https://identity.example.test')
  vi.stubEnv('VITE_SUITE_KEYCLOAK_REALM', 'bubllio')
  vi.stubEnv('VITE_SUITE_KEYCLOAK_CLIENT_ID', 'bubllio-crm')
  adapter.init.mockResolvedValue(true)
  adapter.updateToken.mockResolvedValue(false)
  vi.stubGlobal('window', {
    location: {
      pathname: '/',
      search: '',
      href: 'https://crm.example.test/',
      origin: 'https://crm.example.test',
    },
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('uses PKCE and requires suite login for a Core launcher link', async () => {
  window.location.search = '?organization_id=11111111-1111-4111-8111-111111111111'
  const session = await import('./suiteSession')

  await session.initializeSuiteSession()

  expect(adapter.init).toHaveBeenCalledWith(
    expect.objectContaining({ onLoad: 'login-required', pkceMethod: 'S256' }),
  )
  expect(session.isSuiteSession()).toBe(true)
  expect(await session.suiteAccessToken()).toBe('suite-access-token')
})

it('keeps legacy invitation routes on their existing session path', async () => {
  window.location.pathname = '/invite/legacy-token'
  const session = await import('./suiteSession')

  await session.initializeSuiteSession()

  expect(adapter.init).toHaveBeenCalledWith(expect.objectContaining({ onLoad: 'check-sso' }))
  expect(session.isSuiteSession()).toBe(false)
})

it('stops an authenticated request when the suite token refresh fails', async () => {
  window.location.search = '?organization_id=11111111-1111-4111-8111-111111111111'
  adapter.updateToken.mockRejectedValue(new Error('expired'))
  const session = await import('./suiteSession')

  await session.initializeSuiteSession()

  await expect(session.suiteAccessToken()).rejects.toThrow('expired')
})
