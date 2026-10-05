import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Deal, DealInput } from '../../../types/deal.types'
import { dealService } from '../services/dealService'
export const dealKeys = { list: (org: string) => ['organizations', org, 'deals'] as const }
export const useDeals = (org: string) =>
  useQuery({ queryKey: dealKeys.list(org), queryFn: ({ signal }) => dealService.list(org, signal) })
export const useUpdateDeal = (org: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Deal> }) =>
      dealService.update(org, id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: dealKeys.list(org) }),
  })
}
export const useCreateDeal = (org: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: DealInput) => dealService.create(org, body),
    onSuccess: () => client.invalidateQueries({ queryKey: dealKeys.list(org) }),
  })
}
export const useUpdateDealRecord = (org: string, id: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<DealInput>) => dealService.update(org, id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: dealKeys.list(org) }),
  })
}
export const useMoveDeal = (org: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage, position }: { id: string; stage: Deal['stage']; position: number }) =>
      dealService.move(org, id, stage, position),
    onMutate: async ({ id, stage, position }) => {
      await client.cancelQueries({ queryKey: dealKeys.list(org) })
      const previous = client.getQueryData<Deal[]>(dealKeys.list(org))
      if (previous) {
        const moving = previous.find((deal) => deal.id === id)
        if (moving) {
          const others = previous.filter((deal) => deal.id !== id)
          const destination = others
            .filter((deal) => deal.stage === stage)
            .sort((a, b) => a.sort_order - b.sort_order)
          destination.splice(Math.min(position, destination.length), 0, { ...moving, stage })
          const positions = new Map(destination.map((deal, index) => [deal.id, index]))
          client.setQueryData<Deal[]>(
            dealKeys.list(org),
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
    onError: (_error, _variables, context) =>
      client.setQueryData(dealKeys.list(org), context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: dealKeys.list(org) }),
  })
}
