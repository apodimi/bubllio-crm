import Keycloak from 'keycloak-js'
import { z } from 'zod'
import { apiBase } from '../../config/apiBase'
import { useAuthStore } from './store/authStore'

let keycloak: Keycloak | null = null
let suiteSelected = false
const suiteConfigSchema = z
  .object({
    url: z.string().url(),
    realm: z.string().min(1),
    clientId: z.string().min(1),
  })
  .strict()
type SuiteConfig = z.infer<typeof suiteConfigSchema>
let runtimeConfig: SuiteConfig | null = null

export function suiteRequired() {
  return import.meta.env.PROD || import.meta.env.VITE_SUITE_REQUIRED !== 'false'
}

function suiteConfig() {
  if (runtimeConfig) return runtimeConfig
  const url = import.meta.env.VITE_SUITE_KEYCLOAK_URL
  const realm = import.meta.env.VITE_SUITE_KEYCLOAK_REALM
  const clientId = import.meta.env.VITE_SUITE_KEYCLOAK_CLIENT_ID

  if (!url && !realm && !clientId) return null
  if (!url || !realm || !clientId) throw new Error('Suite identity configuration is incomplete')

  return validateSuiteConfig({ url, realm, clientId })
}

function validateSuiteConfig(value: unknown): SuiteConfig {
  const config = suiteConfigSchema.parse(value)
  const endpoint = new URL(config.url)
  const localHttp =
    import.meta.env.DEV &&
    endpoint.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(endpoint.hostname)
  if (endpoint.protocol !== 'https:' && !localHttp) {
    throw new Error('Suite identity URL must use HTTPS')
  }

  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('Suite identity URL must not contain credentials or query data')
  }
  return config
}

async function loadRuntimeConfig(): Promise<SuiteConfig> {
  const response = await fetch(`${apiBase()}/auth/suite/config/`, {
    cache: 'no-store',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Suite identity configuration is unavailable')
  return validateSuiteConfig(await response.json())
}

export function suiteAvailable() {
  if (suiteRequired()) return runtimeConfig !== null
  return suiteConfig() !== null
}

export async function initializeSuiteSession() {
  const required = suiteRequired()
  if (required) useAuthStore.getState().clearSession()
  const config = required ? (runtimeConfig = await loadRuntimeConfig()) : suiteConfig()
  if (!config) {
    if (required) throw new Error('Suite identity configuration is required')
    return
  }

  keycloak = new Keycloak(config)
  const launchHint = new URLSearchParams(window.location.search).has('organization_id')
  let authenticated: boolean
  try {
    authenticated = await keycloak.init({
      onLoad: required || launchHint ? 'login-required' : 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    })
  } catch (error) {
    if (required || launchHint) throw error
    keycloak = null
    return
  }
  if (required && !authenticated) throw new Error('Suite sign-in is required')
  const legacyPublicPath = /^\/(invite|installation-admin-invite|reset-password)(\/|$)/.test(
    window.location.pathname,
  )
  const legacySession = Boolean(useAuthStore.getState().accessToken)
  suiteSelected = required || launchHint || (authenticated && !legacySession && !legacyPublicPath)
}

export function isSuiteSession() {
  return suiteRequired() || suiteSelected
}

export async function suiteAccessToken() {
  if (!keycloak || !suiteSelected) throw new Error('Suite session is unavailable')

  const refreshed = await keycloak.updateToken(30)
  if (!refreshed && !keycloak.token) throw new Error('Suite session expired')
  if (!keycloak.token) throw new Error('Suite session expired')

  return keycloak.token
}

export async function signInToSuite() {
  if (!keycloak) throw new Error('Suite identity is unavailable')
  suiteSelected = true
  await keycloak.login({ redirectUri: window.location.href })
}

export async function signOutOfSuite() {
  if (!keycloak) return
  suiteSelected = false
  await keycloak.logout({ redirectUri: window.location.origin })
}
