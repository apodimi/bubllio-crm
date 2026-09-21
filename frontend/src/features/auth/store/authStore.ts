import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
  username: string
  email: string
  is_superuser: boolean
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (tokens: { access: string; refresh: string }, user: AuthUser) => void
  setAccessToken: (accessToken: string) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (tokens, user) =>
        set({ accessToken: tokens.access, refreshToken: tokens.refresh, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearSession: () => {
        set({ accessToken: null, refreshToken: null, user: null })
        void useAuthStore.persist.clearStorage()
      },
    }),
    {
      name: 'bubllio-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
