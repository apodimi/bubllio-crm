import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CollaboratorInput,
  CollaboratorServiceInput,
  DealCostInput,
} from '../../../types/costing.types'
import { costingService } from '../services/costingService'

export const costingKeys = {
  root: (organizationId: string) => ['organizations', organizationId, 'costing'] as const,
  collaborators: (organizationId: string) =>
    [...costingKeys.root(organizationId), 'collaborators'] as const,
  services: (organizationId: string, collaboratorId?: string) =>
    [...costingKeys.root(organizationId), 'services', collaboratorId ?? 'all'] as const,
  deal: (organizationId: string, dealId: string) =>
    [...costingKeys.root(organizationId), 'deals', dealId] as const,
  costs: (organizationId: string, dealId: string) =>
    [...costingKeys.deal(organizationId, dealId), 'costs'] as const,
  profitability: (organizationId: string, dealId: string) =>
    [...costingKeys.deal(organizationId, dealId), 'profitability'] as const,
}

export const useCollaborators = (organizationId: string, enabled = true) =>
  useQuery({
    enabled,
    queryKey: costingKeys.collaborators(organizationId),
    queryFn: ({ signal }) => costingService.listCollaborators(organizationId, signal),
  })

export const useCollaboratorServices = (
  organizationId: string,
  collaboratorId?: string,
  enabled = true,
) =>
  useQuery({
    enabled,
    queryKey: costingKeys.services(organizationId, collaboratorId),
    queryFn: ({ signal }) => costingService.listServices(organizationId, collaboratorId, signal),
  })

export const useDealCosts = (organizationId: string, dealId: string) =>
  useQuery({
    queryKey: costingKeys.costs(organizationId, dealId),
    queryFn: ({ signal }) => costingService.listDealCosts(organizationId, dealId, signal),
  })

export const useDealProfitability = (organizationId: string, dealId: string) =>
  useQuery({
    queryKey: costingKeys.profitability(organizationId, dealId),
    queryFn: ({ signal }) => costingService.profitability(organizationId, dealId, signal),
  })

const useInvalidateDeal = (organizationId: string, dealId: string) => {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: costingKeys.deal(organizationId, dealId) })
}

export function useCreateCollaborator(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CollaboratorInput) =>
      costingService.createCollaborator(organizationId, body),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: costingKeys.collaborators(organizationId) }),
  })
}

export function useUpdateCollaborator(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CollaboratorInput> }) =>
      costingService.updateCollaborator(organizationId, id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: costingKeys.root(organizationId) }),
  })
}

export function useCreateCollaboratorService(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CollaboratorServiceInput) =>
      costingService.createService(organizationId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: costingKeys.root(organizationId) }),
  })
}

export function useUpdateCollaboratorService(organizationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CollaboratorServiceInput> }) =>
      costingService.updateService(organizationId, id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: costingKeys.root(organizationId) }),
  })
}

export function useCreateDealCost(organizationId: string, dealId: string) {
  const invalidate = useInvalidateDeal(organizationId, dealId)
  return useMutation({
    mutationFn: (body: DealCostInput) =>
      costingService.createDealCost(organizationId, dealId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateDealCost(organizationId: string, dealId: string) {
  const invalidate = useInvalidateDeal(organizationId, dealId)
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<DealCostInput> }) =>
      costingService.updateDealCost(organizationId, dealId, id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteDealCost(organizationId: string, dealId: string) {
  const invalidate = useInvalidateDeal(organizationId, dealId)
  return useMutation({
    mutationFn: (id: string) => costingService.deleteDealCost(organizationId, dealId, id),
    onSuccess: invalidate,
  })
}
