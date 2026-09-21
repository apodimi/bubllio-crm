import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../services/api'
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    },
    mutations: { retry: false },
  },
})
