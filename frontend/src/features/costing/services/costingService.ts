import { request } from '../../../services/api'
import type {
  Collaborator,
  CollaboratorInput,
  CollaboratorService,
  CollaboratorServiceInput,
  DealCost,
  DealCostInput,
  DealProfitability,
} from '../../../types/costing.types'
import { organizationPath } from '../../organizations'

const root = (organizationId: string) => `${organizationPath(organizationId)}costing/`
const dealRoot = (organizationId: string, dealId: string) =>
  `${organizationPath(organizationId)}deals/${encodeURIComponent(dealId)}/`

export const costingService = {
  listCollaborators: (organizationId: string, signal?: AbortSignal) =>
    request<Collaborator[]>(`${root(organizationId)}collaborators/`, { signal }),
  createCollaborator: (organizationId: string, body: CollaboratorInput) =>
    request<Collaborator>(`${root(organizationId)}collaborators/`, { method: 'POST', body }),
  updateCollaborator: (organizationId: string, id: string, body: Partial<CollaboratorInput>) =>
    request<Collaborator>(`${root(organizationId)}collaborators/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body,
    }),
  listServices: (organizationId: string, collaboratorId?: string, signal?: AbortSignal) => {
    const query = collaboratorId ? `?collaborator=${encodeURIComponent(collaboratorId)}` : ''
    return request<CollaboratorService[]>(`${root(organizationId)}collaborator-services/${query}`, {
      signal,
    })
  },
  createService: (organizationId: string, body: CollaboratorServiceInput) =>
    request<CollaboratorService>(`${root(organizationId)}collaborator-services/`, {
      method: 'POST',
      body,
    }),
  updateService: (organizationId: string, id: string, body: Partial<CollaboratorServiceInput>) =>
    request<CollaboratorService>(
      `${root(organizationId)}collaborator-services/${encodeURIComponent(id)}/`,
      {
        method: 'PATCH',
        body,
      },
    ),
  listDealCosts: (organizationId: string, dealId: string, signal?: AbortSignal) =>
    request<DealCost[]>(`${dealRoot(organizationId, dealId)}costs/`, { signal }),
  createDealCost: (organizationId: string, dealId: string, body: DealCostInput) =>
    request<DealCost>(`${dealRoot(organizationId, dealId)}costs/`, { method: 'POST', body }),
  updateDealCost: (
    organizationId: string,
    dealId: string,
    id: string,
    body: Partial<DealCostInput>,
  ) =>
    request<DealCost>(`${dealRoot(organizationId, dealId)}costs/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body,
    }),
  deleteDealCost: (organizationId: string, dealId: string, id: string) =>
    request<void>(`${dealRoot(organizationId, dealId)}costs/${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    }),
  profitability: (organizationId: string, dealId: string, signal?: AbortSignal) =>
    request<DealProfitability>(`${dealRoot(organizationId, dealId)}profitability/`, { signal }),
}
