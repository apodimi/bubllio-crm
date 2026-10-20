import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { activityInboxKeys } from '../../activity-inbox'
import type { Deal, DealInput } from '../../../types/deal.types'
import { dealService, type DealFilters } from '../services/dealService'
export const dealKeys = {
  byOrganization: (org: string) => ['organizations', org, 'deals'] as const,
  list: (org: string, filters: DealFilters = {}) =>
    [...dealKeys.byOrganization(org), 'list', filters] as const,
  detail: (org: string, id: string) => [...dealKeys.byOrganization(org), 'detail', id] as const,
}
const invalidateDeals = (client: ReturnType<typeof useQueryClient>, org: string) =>
  Promise.all([
    client.invalidateQueries({ queryKey: dealKeys.byOrganization(org) }),
    client.invalidateQueries({ queryKey: activityInboxKeys.detail(org) }),
  ])
export const useDeals = (org: string, filters: DealFilters = {}) =>
  useQuery({
    queryKey: dealKeys.list(org, filters),
    queryFn: ({ signal }) => dealService.list(org, filters, signal),
  })
export const useDeal = (org: string, id: string) =>
  useQuery({
    queryKey: dealKeys.detail(org, id),
    queryFn: ({ signal }) => dealService.get(org, id, signal),
    enabled: Boolean(id),
  })
export const useUpdateDeal = (org: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Deal> }) =>
      dealService.update(org, id, body),
    onSuccess: () => invalidateDeals(client, org),
  })
}
export const useCreateDeal = (org: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: DealInput) => dealService.create(org, body),
    onSuccess: () => invalidateDeals(client, org),
  })
}
export const useUpdateDealRecord = (org: string, id: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<DealInput>) => dealService.update(org, id, body),
    onSuccess: () => invalidateDeals(client, org),
  })
}
export const useMoveDeal = (org: string, filters: DealFilters = {}) => {
  const client = useQueryClient()
  const listKey = dealKeys.list(org, filters)
  return useMutation({
    mutationFn: ({ id, stage, position }: { id: string; stage: Deal['stage']; position: number }) =>
      dealService.move(org, id, stage, position),
    onMutate: async ({ id, stage, position }) => {
      await client.cancelQueries({ queryKey: listKey })
      const previous = client.getQueryData<Deal[]>(listKey)
      if (previous) {
        const moving = previous.find((deal) => deal.id === id)
        if (moving) {
          const others = previous.filter((deal) => deal.id !== id)
          if (filters.stage && filters.stage !== stage) {
            client.setQueryData<Deal[]>(listKey, others)
            return { previous }
          }
          const destination = others
            .filter((deal) => deal.stage === stage)
            .sort((a, b) => a.sort_order - b.sort_order)
          destination.splice(Math.min(position, destination.length), 0, { ...moving, stage })
          const positions = new Map(destination.map((deal, index) => [deal.id, index]))
          client.setQueryData<Deal[]>(
            listKey,
            others.concat(
              destination.map((deal) => ({
                ...deal,
                sort_order: positions.get(deal.id) ?? deal.sort_order,
              })),
            ),
          )
        }
      }
      return { previous }
    },
    onError: (_error, _variables, context) => client.setQueryData(listKey, context?.previous),
    onSettled: () => invalidateDeals(client, org),
  })
}

export const useArchiveDeal = (org: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dealService.archive(org, id),
    onSuccess: () => invalidateDeals(client, org),
  })
}

export const useDeleteDeal = (org: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dealService.remove(org, id),
    onSuccess: () => invalidateDeals(client, org),
  })
}
