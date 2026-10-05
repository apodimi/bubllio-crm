import { request } from '../../../services/api'
import { organizationPath } from '../../organizations'
import type { Deal } from '../../../types/deal.types'
const path = (org:string, id?:string) => `${organizationPath(org)}deals/${id ? `${encodeURIComponent(id)}/` : ''}`
export const dealService = { list:(org:string, signal?:AbortSignal)=>request<Deal[]>(path(org),{signal}), update:(org:string,id:string,body:Partial<Deal>)=>request<Deal>(path(org,id),{method:'PATCH',body}) }
