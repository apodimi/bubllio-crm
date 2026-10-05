import { request } from '../../../services/api'
import type { CatalogItemInput, Charge, CustomerSubscription, Payment, PaymentInput, ServiceCatalogItem, SubscriptionInput } from '../../../types/subscription.types'
import { organizationPath } from '../../organizations'

const root = (organizationId: string) => `${organizationPath(organizationId)}services/`

export const subscriptionService = {
  listCatalog: (organizationId: string, signal?: AbortSignal) => request<ServiceCatalogItem[]>(`${root(organizationId)}catalog/`, { signal }),
  createCatalogItem: (organizationId: string, body: CatalogItemInput) => request<ServiceCatalogItem>(`${root(organizationId)}catalog/`, { method: 'POST', body }),
  updateCatalogItem: (organizationId: string, id: string, body: Partial<CatalogItemInput>) => request<ServiceCatalogItem>(`${root(organizationId)}catalog/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  listSubscriptions: (organizationId: string, signal?: AbortSignal) => request<CustomerSubscription[]>(`${root(organizationId)}subscriptions/`, { signal }),
  createSubscription: (organizationId: string, body: SubscriptionInput) => request<CustomerSubscription>(`${root(organizationId)}subscriptions/`, { method: 'POST', body }),
  updateSubscription: (organizationId: string, id: string, body: Partial<SubscriptionInput>) => request<CustomerSubscription>(`${root(organizationId)}subscriptions/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  listCharges: (organizationId: string, signal?: AbortSignal) => request<Charge[]>(`${root(organizationId)}charges/`, { signal }),
  recordPayment: (organizationId: string, chargeId: string, body: PaymentInput) => request<Payment>(`${root(organizationId)}charges/${encodeURIComponent(chargeId)}/payments/`, { method: 'POST', body }),
}
