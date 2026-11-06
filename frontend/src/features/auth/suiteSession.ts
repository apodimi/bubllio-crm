import Keycloak from 'keycloak-js'
import { useAuthStore } from './store/authStore'

let keycloak: Keycloak | null = null
let suiteSelected = false

function suiteConfig() {
  const url = import.meta.env.VITE_SUITE_KEYCLOAK_URL
  const realm = import.meta.env.VITE_SUITE_KEYCLOAK_REALM
  const clientId = import.meta.env.VITE_SUITE_KEYCLOAK_CLIENT_ID

  if (!url && !realm && !clientId) return null
  if (!url || !realm || !clientId) throw new Error('Suite identity configuration is incomplete')

  const endpoint = new URL(url)
  const localHttp =
    import.meta.env.DEV &&
    endpoint.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(endpoint.hostname)
  if (endpoint.protocol !== 'https:' && !localHttp) {
    throw new Error('Suite identity URL must use HTTPS')
  }

  return { url, realm, clientId }
}

export function suiteAvailable() {
  return suiteConfig() !== null
}

export async function initializeSuiteSession() {
  const config = suiteConfig()
  if (!config) return

  keycloak = new Keycloak(config)
  const launchHint = new URLSearchParams(window.location.search).has('organization_id')
  let authenticated: boolean
  try {
    authenticated = await keycloak.init({
      onLoad: launchHint ? 'login-required' : 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    })
  } catch (error) {
    if (launchHint) throw error
    keycloak = null
    return
  }
  const legacyPublicPath = /^\/(invite|installation-admin-invite|reset-password)(\/|$)/.test(
    window.location.pathname,
  )
  const legacySession = Boolean(useAuthStore.getState().accessToken)
  suiteSelected = launchHint || (authenticated && !legacySession && !legacyPublicPath)
}

export function isSuiteSession() {
  return suiteSelected
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
