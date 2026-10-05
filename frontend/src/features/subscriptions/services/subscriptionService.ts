import { request } from '../../../services/api'
import type {
  CatalogItemInput,
  Charge,
  CustomerSubscription,
  Payment,
  PaymentInput,
  ServiceCatalogItem,
  SubscriptionInput,
  SubscriptionOverview,
} from '../../../types/subscription.types'
import { organizationPath } from '../../organizations'

const root = (organizationId: string) => `${organizationPath(organizationId)}services/`

export const subscriptionService = {
  listCatalog: (organizationId: string, signal?: AbortSignal) =>
    request<ServiceCatalogItem[]>(`${root(organizationId)}catalog/`, { signal }),
  createCatalogItem: (organizationId: string, body: CatalogItemInput) =>
    request<ServiceCatalogItem>(`${root(organizationId)}catalog/`, { method: 'POST', body }),
  updateCatalogItem: (organizationId: string, id: string, body: Partial<CatalogItemInput>) =>
    request<ServiceCatalogItem>(`${root(organizationId)}catalog/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body,
    }),
  listSubscriptions: (organizationId: string, signal?: AbortSignal) =>
    request<CustomerSubscription[]>(`${root(organizationId)}subscriptions/`, { signal }),
  createSubscription: (organizationId: string, body: SubscriptionInput) =>
    request<CustomerSubscription>(`${root(organizationId)}subscriptions/`, {
      method: 'POST',
      body,
    }),
  updateSubscription: (organizationId: string, id: string, body: Partial<SubscriptionInput>) =>
    request<CustomerSubscription>(
      `${root(organizationId)}subscriptions/${encodeURIComponent(id)}/`,
      { method: 'PATCH', body },
    ),
  cancelSubscription: (organizationId: string, id: string, mode: 'end_of_period' | 'immediate') =>
    request<CustomerSubscription>(
      `${root(organizationId)}subscriptions/${encodeURIComponent(id)}/cancel/`,
      { method: 'POST', body: { mode } },
    ),
  resumeSubscription: (organizationId: string, id: string) =>
    request<CustomerSubscription>(
      `${root(organizationId)}subscriptions/${encodeURIComponent(id)}/resume/`,
      { method: 'POST' },
    ),
  overview: (organizationId: string, signal?: AbortSignal) =>
    request<SubscriptionOverview>(`${root(organizationId)}overview/`, { signal }),
  listCharges: (organizationId: string, signal?: AbortSignal) =>
    request<Charge[]>(`${root(organizationId)}charges/`, { signal }),
  recordPayment: (organizationId: string, chargeId: string, body: PaymentInput) =>
    request<Payment>(`${root(organizationId)}charges/${encodeURIComponent(chargeId)}/payments/`, {
      method: 'POST',
      body,
    }),
}
