import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services/authService'

export function useAccountSettings() {
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['account-settings'],
    queryFn: ({ signal }) => authService.accountSettings(signal),
  })
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => authService.patchAccountSettings(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-settings'] }),
  })
  const changePassword = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      authService.changePassword(body),
  })
  return { settings, save, changePassword }
}
