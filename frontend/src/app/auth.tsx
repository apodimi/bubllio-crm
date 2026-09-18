import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { request, type TokenPair } from '../api/client'
import type { Organization } from '../api/types'
import { queryClient } from './queryClient'
import { useAuthStore } from './authStore'

interface Auth {
  username: string | null
  login: (name: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Context = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const username = useAuthStore((state) => state.user?.username ?? null)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)

  const logout = async () => {
    const refresh = useAuthStore.getState().refreshToken
    try {
      if (refresh) await request('/auth/logout/', { body: { refresh } })
    } finally {
      clearSession()
      queryClient.clear()
    }
  }

  const login = async (name: string, password: string) => {
    queryClient.clear()
    let tokens: TokenPair
    try {
      tokens = await request<TokenPair>('/auth/token/', { body: { username: name, password } })
    } catch {
      throw new Error('Invalid username or password.')
    }
    useAuthStore.setState({ accessToken: tokens.access, refreshToken: tokens.refresh })
    try {
      const user = await request<{
        id: number
        username: string
        email: string
        is_superuser: boolean
        organizations: Organization[]
      }>('/auth/me/')
      setSession(tokens, user)
    } catch (error) {
      clearSession()
      throw error
    }
  }

  return <Context.Provider value={{ username, login, logout }}>{children}</Context.Provider>
}

export function useAuth() {
  const auth = useContext(Context)
  if (!auth) throw new Error('AuthProvider is required')
  return auth
}
