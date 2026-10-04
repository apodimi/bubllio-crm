import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { organizationService } from '../services/organizationService'
import type { WorkspaceSettings } from '../../../types/organization.types'

export function useOrganizationSettings(id: string, canManage = true) {
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['organizations', id, 'settings'],
    queryFn: ({ signal }) => organizationService.settings(id, signal),
  })
  const accounts = useQuery({
    queryKey: ['organizations', id, 'email-accounts'],
    queryFn: ({ signal }) => organizationService.emailAccounts(id, signal),
  })
  const options = useQuery({
    queryKey: ['organization-settings-options'],
    queryFn: ({ signal }) => organizationService.settingsOptions(signal),
  })
  const activity = useQuery({
    queryKey: ['organizations', id, 'activity'],
    queryFn: ({ signal }) => organizationService.activity(id, signal),
    enabled: canManage,
  })
  const saveSettings = useMutation({
    mutationFn: (body: Partial<WorkspaceSettings>) =>
      organizationService.patchSettings(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations', id, 'settings'] }),
  })
  const createAccount = useMutation({
    mutationFn: (body: Record<string, unknown>) => organizationService.createEmailAccount(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['organizations', id, 'email-accounts'] }),
  })
  const updateAccount = useMutation({
    mutationFn: ({ accountId, body }: { accountId: string; body: Record<string, unknown> }) =>
      organizationService.updateEmailAccount(id, accountId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['organizations', id, 'email-accounts'] }),
  })
  const testAccount = useMutation({
    mutationFn: ({ accountId, recipient }: { accountId: string; recipient: string }) =>
      organizationService.testEmailAccount(id, accountId, recipient),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['organizations', id, 'email-accounts'] }),
  })
  const deleteAccount = useMutation({
    mutationFn: (accountId: string) => organizationService.deleteEmailAccount(id, accountId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['organizations', id, 'email-accounts'] }),
  })
  const downloadExport = useMutation({
    mutationFn: () => organizationService.downloadExport(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations', id, 'activity'] }),
  })
  const deleteOrganization = useMutation({ mutationFn: () => organizationService.remove(id) })
  return {
    settings,
    accounts,
    options,
    activity,
    saveSettings,
    createAccount,
    updateAccount,
    testAccount,
    deleteAccount,
    downloadExport,
    deleteOrganization,
  }
}
