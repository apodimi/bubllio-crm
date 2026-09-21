import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { organizationService } from '../services/organizationService'

export function useOrganizationSettings(id: string) {
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['organizations', id, 'settings'],
    queryFn: ({ signal }) => organizationService.settings(id, signal),
  })
  const accounts = useQuery({
    queryKey: ['organizations', id, 'email-accounts'],
    queryFn: ({ signal }) => organizationService.emailAccounts(id, signal),
  })
  const saveSettings = useMutation({
    mutationFn: (body: { timezone?: string; locale?: string; default_from_name?: string }) =>
      organizationService.patchSettings(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations', id, 'settings'] }),
  })
  const createAccount = useMutation({
    mutationFn: (body: Record<string, unknown>) => organizationService.createEmailAccount(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['organizations', id, 'email-accounts'] }),
  })
  return { settings, accounts, saveSettings, createAccount }
}
