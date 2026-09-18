import { afterEach, expect, it } from 'vitest'
import { apiBase } from './client'
import { useAuthStore } from '../app/authStore'
import { keys, organizationPath } from './queries'

afterEach(() => useAuthStore.getState().clearSession())

it('accepts only same-origin API base paths', () => {
  expect(apiBase('/api/v1/')).toBe('/api/v1')
  expect(() => apiBase('https://example.com')).toThrow('same-origin')
  expect(() => apiBase('//example.com')).toThrow('same-origin')
})

it('keeps the JWT session in the Zustand store and clears it on logout', () => {
  useAuthStore.getState().setSession(
    { access: 'access-token', refresh: 'refresh-token' },
    { id: 1, username: 'demo', email: 'demo@example.com', is_superuser: false },
  )
  expect(useAuthStore.getState().accessToken).toBe('access-token')
  expect(useAuthStore.getState().refreshToken).toBe('refresh-token')
  useAuthStore.getState().clearSession()
  expect(useAuthStore.getState().user).toBeNull()
  expect(useAuthStore.getState().accessToken).toBeNull()
})

it('isolates resource keys and URL segments by tenant', () => {
  expect(keys.companies('one')).not.toEqual(keys.companies('two'))
  expect(keys.contacts('one')).not.toEqual(keys.companies('one'))
  expect(organizationPath('a/b')).toBe('/organizations/a%2Fb/')
})
