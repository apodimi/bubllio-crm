import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { TokenPair } from '../../../services/api'
import { queryClient } from '../../../config/queryClient'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'

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
      if (refresh) await authService.logout(refresh)
    } finally {
      clearSession()
      queryClient.clear()
    }
  }

  const login = async (name: string, password: string) => {
    queryClient.clear()
    let tokens: TokenPair
    try {
      tokens = await authService.login(name, password)
    } catch {
      throw new Error('Invalid username or password.')
    }
    useAuthStore.setState({ accessToken: tokens.access, refreshToken: tokens.refresh })
    try {
      const user = await authService.currentUser()
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
