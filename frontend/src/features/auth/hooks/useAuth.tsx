import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TokenPair } from '../../../services/api'
import { queryClient } from '../../../config/queryClient'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'
import { isSuiteSession, signInToSuite, signOutOfSuite, suiteAvailable } from '../suiteSession'

interface Auth {
  username: string | null
  mode: 'legacy' | 'suite'
  loading: boolean
  error: Error | null
  retry: () => void
  suiteAvailable: boolean
  signInToSuite: () => Promise<void>
  login: (name: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Context = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const legacyUsername = useAuthStore((state) => state.user?.username ?? null)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)
  const mode = isSuiteSession() ? 'suite' : 'legacy'
  const suiteUser = useQuery({
    queryKey: ['auth', 'suite', 'me'],
    queryFn: authService.currentUser,
    enabled: mode === 'suite',
    retry: false,
  })
  const username = mode === 'suite' ? (suiteUser.data?.username ?? null) : legacyUsername

  const logout = async () => {
    if (mode === 'suite') {
      queryClient.clear()
      clearSession()
      await signOutOfSuite()
      return
    }

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

  return (
    <Context.Provider
      value={{
        username,
        mode,
        loading: mode === 'suite' && suiteUser.isPending,
        error: mode === 'suite' && suiteUser.isError ? suiteUser.error : null,
        retry: () => void suiteUser.refetch(),
        suiteAvailable: suiteAvailable(),
        signInToSuite,
        login,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useAuth() {
  const auth = useContext(Context)
  if (!auth) throw new Error('AuthProvider is required')
  return auth
}
