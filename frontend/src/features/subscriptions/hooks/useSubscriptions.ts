import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CatalogItemInput, PaymentInput, SubscriptionInput } from '../../../types/subscription.types'
import { subscriptionService } from '../services/subscriptionService'

const keys = {
  root: (organizationId: string) => ['organizations', organizationId, 'services'] as const,
  catalog: (organizationId: string) => [...keys.root(organizationId), 'catalog'] as const,
  subscriptions: (organizationId: string) => [...keys.root(organizationId), 'subscriptions'] as const,
  charges: (organizationId: string) => [...keys.root(organizationId), 'charges'] as const,
}

export const useCatalog = (organizationId: string) => useQuery({ queryKey: keys.catalog(organizationId), queryFn: ({ signal }) => subscriptionService.listCatalog(organizationId, signal) })
export const useSubscriptions = (organizationId: string) => useQuery({ queryKey: keys.subscriptions(organizationId), queryFn: ({ signal }) => subscriptionService.listSubscriptions(organizationId, signal) })
export const useCharges = (organizationId: string) => useQuery({ queryKey: keys.charges(organizationId), queryFn: ({ signal }) => subscriptionService.listCharges(organizationId, signal) })

export function useCreateCatalogItem(organizationId: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: (body: CatalogItemInput) => subscriptionService.createCatalogItem(organizationId, body), onSuccess: () => client.invalidateQueries({ queryKey: keys.catalog(organizationId) }) })
}
export function useUpdateCatalogItem(organizationId: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<CatalogItemInput> }) => subscriptionService.updateCatalogItem(organizationId, id, body), onSuccess: () => client.invalidateQueries({ queryKey: keys.catalog(organizationId) }) })
}
export function useCreateSubscription(organizationId: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: (body: SubscriptionInput) => subscriptionService.createSubscription(organizationId, body), onSuccess: () => client.invalidateQueries({ queryKey: keys.root(organizationId) }) })
}
export function useUpdateSubscription(organizationId: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<SubscriptionInput> }) => subscriptionService.updateSubscription(organizationId, id, body), onSuccess: () => client.invalidateQueries({ queryKey: keys.root(organizationId) }) })
}
export function useRecordPayment(organizationId: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ chargeId, body }: { chargeId: string; body: PaymentInput }) => subscriptionService.recordPayment(organizationId, chargeId, body), onSuccess: () => client.invalidateQueries({ queryKey: keys.root(organizationId) }) })
}
