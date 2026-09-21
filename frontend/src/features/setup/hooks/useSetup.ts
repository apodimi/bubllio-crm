import { useMutation, useQuery } from '@tanstack/react-query'
import { setupService } from '../services/setupService'

export function useSetupStatus() {
  return useQuery({
    queryKey: ['installation-setup'],
    queryFn: ({ signal }) => setupService.status(signal),
    retry: false,
  })
}

export function useCompleteSetup() {
  return useMutation({ mutationFn: setupService.complete })
}

export function useTestSmtpConnection() {
  return useMutation({ mutationFn: setupService.testSmtp })
}
