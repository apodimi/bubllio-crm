import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Deal } from '../../../types/deal.types'
import { dealService } from '../services/dealService'
export const dealKeys = { list:(org:string)=>['organizations',org,'deals'] as const }
export const useDeals = (org:string) => useQuery({queryKey:dealKeys.list(org),queryFn:({signal})=>dealService.list(org,signal)})
export const useUpdateDeal = (org:string) => { const client=useQueryClient(); return useMutation({mutationFn:({id,body}:{id:string;body:Partial<Deal>})=>dealService.update(org,id,body),onSuccess:()=>client.invalidateQueries({queryKey:dealKeys.list(org)})}) }
