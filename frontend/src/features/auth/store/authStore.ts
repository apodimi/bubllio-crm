import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

const memoryStorage = new Map<string, string>()
const fallbackStorage: StateStorage = {
  getItem: (name) => memoryStorage.get(name) ?? null,
  setItem: (name, value) => {
    memoryStorage.set(name, value)
  },
  removeItem: (name) => {
    memoryStorage.delete(name)
  },
}

function getSessionStorage(): StateStorage {
  try {
    const storage = globalThis.sessionStorage
    const probe = '__bubllio_storage_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return fallbackStorage
  }
}

const authStorage = createJSONStorage(getSessionStorage)

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
        void authStorage?.removeItem('bubllio-auth')
      },
    }),
    {
      name: 'bubllio-auth',
      storage: authStorage,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
