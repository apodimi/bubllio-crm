import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { useAuthStore } from '../features/auth/store/authStore'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface TokenPair {
  access: string
  refresh: string
}

interface RefreshResponse {
  access: string
  refresh?: string
}

export function apiBase(value = import.meta.env.VITE_API_BASE_PATH || '/api/v1') {
  if (!value.startsWith('/') || value.startsWith('//') || /[?#\\]/.test(value)) {
    throw new Error('VITE_API_BASE_PATH must be a same-origin path.')
  }
  return value.replace(/\/$/, '')
}

export const apiClient = axios.create({
  baseURL: apiBase(),
  withCredentials: false,
  headers: { Accept: 'application/json' },
})

function messageFor(status: number, body: unknown) {
  if (status === 401 || status === 403)
    return 'Sign-in or permission check failed. Please sign in again or contact your workspace owner.'
  if (status === 404) return 'This resource is unavailable or you do not have access.'
  if (status >= 500) return 'The server could not complete this request. Please try again.'
  if (typeof body === 'object' && body !== null) {
    return Object.entries(body)
      .map(([key, value]) => key + ': ' + (Array.isArray(value) ? value.join(' ') : String(value)))
      .join(' · ')
  }
  return 'The request could not be completed.'
}

let refreshing: Promise<string> | null = null

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.response) throw error
    const original = error.config as NonNullable<typeof error.config> & { _retry?: boolean }
    const isAuthRoute = original.url?.startsWith('/auth/token/')
    if (error.response.status !== 401 || original._retry || isAuthRoute) throw error

    const refresh = useAuthStore.getState().refreshToken
    if (!refresh) {
      useAuthStore.getState().clearSession()
      throw error
    }

    original._retry = true
    refreshing ??= apiClient
      .post<RefreshResponse>('/auth/token/refresh/', { refresh })
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.access)
        if (data.refresh) useAuthStore.setState({ refreshToken: data.refresh })
        return data.access
      })
      .finally(() => {
        refreshing = null
      })
    try {
      await refreshing
      return apiClient(original)
    } catch (refreshError) {
      useAuthStore.getState().clearSession()
      throw refreshError
    }
  },
)

export async function request<T>(
  path: string,
  options: {
    signal?: AbortSignal
    body?: unknown
    method?: AxiosRequestConfig['method']
  } = {},
): Promise<T> {
  const config: AxiosRequestConfig = {
    url: path,
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    signal: options.signal,
    data: options.body,
  }
  try {
    const response = await apiClient.request<T>(config)
    return response.data
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      throw new ApiError(status, messageFor(status, error.response?.data))
    }
    throw error
  }
}
