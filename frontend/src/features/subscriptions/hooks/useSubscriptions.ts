import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CatalogItemInput,
  CreateSubscriptionInput,
  PaymentInput,
  SubscriptionInput,
} from '../../../types/subscription.types'
import { subscriptionService } from '../services/subscriptionService'
import { activityInboxKeys } from '../../activity-inbox'

const keys = {
  root: (organizationId: string) => ['organizations', organizationId, 'services'] as const,
  catalog: (organizationId: string) => [...keys.root(organizationId), 'catalog'] as const,
  subscriptions: (organizationId: string) =>
    [...keys.root(organizationId), 'subscriptions'] as const,
  charges: (organizationId: string) => [...keys.root(organizationId), 'charges'] as const,
  overview: (organizationId: string) => [...keys.root(organizationId), 'overview'] as const,
}
const invalidateServices = (client: ReturnType<typeof useQueryClient>, organizationId: string) =>
  Promise.all([
    client.invalidateQueries({ queryKey: keys.root(organizationId) }),
    client.invalidateQueries({ queryKey: activityInboxKeys.detail(organizationId) }),
  ])

export const useCatalog = (organizationId: string, enabled = true) =>
  useQuery({
    enabled,
    queryKey: keys.catalog(organizationId),
    queryFn: ({ signal }) => subscriptionService.listCatalog(organizationId, signal),
  })
export const useSubscriptions = (organizationId: string, enabled = true) =>
  useQuery({
    enabled,
    queryKey: keys.subscriptions(organizationId),
    queryFn: ({ signal }) => subscriptionService.listSubscriptions(organizationId, signal),
  })
export const useCharges = (organizationId: string, enabled = true) =>
  useQuery({
    enabled,
    queryKey: keys.charges(organizationId),
    queryFn: ({ signal }) => subscriptionService.listCharges(organizationId, signal),
  })
export const useSubscriptionOverview = (organizationId: string) =>
  useQuery({
    queryKey: keys.overview(organizationId),
    queryFn: ({ signal }) => subscriptionService.overview(organizationId, signal),
  })

export function useCreateCatalogItem(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CatalogItemInput) =>
      subscriptionService.createCatalogItem(organizationId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.catalog(organizationId) }),
  })
}
export function useUpdateCatalogItem(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CatalogItemInput> }) =>
      subscriptionService.updateCatalogItem(organizationId, id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.catalog(organizationId) }),
  })
}
export function useCreateSubscription(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSubscriptionInput) =>
      subscriptionService.createSubscription(organizationId, body),
    onSuccess: () => invalidateServices(client, organizationId),
  })
}
export function useUpdateSubscription(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<SubscriptionInput> }) =>
      subscriptionService.updateSubscription(organizationId, id, body),
    onSuccess: () => invalidateServices(client, organizationId),
  })
}
export function useRecordPayment(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ chargeId, body }: { chargeId: string; body: PaymentInput }) =>
      subscriptionService.recordPayment(organizationId, chargeId, body),
    onSuccess: () => invalidateServices(client, organizationId),
  })
}
export function useCancelSubscription(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: 'end_of_period' | 'immediate' }) =>
      subscriptionService.cancelSubscription(organizationId, id, mode),
    onSuccess: () => invalidateServices(client, organizationId),
  })
}
export function useResumeSubscription(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => subscriptionService.resumeSubscription(organizationId, id),
    onSuccess: () => invalidateServices(client, organizationId),
  })
}

export function usePauseSubscription(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => subscriptionService.pauseSubscription(organizationId, id),
    onSuccess: () => invalidateServices(client, organizationId),
  })
}
