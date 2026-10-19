import { request } from '../../../services/api'
import {
  catalogItemContract,
  chargeContract,
  customerSubscriptionContract,
  subscriptionOverviewContract,
} from '../../../types/api-contract/schemas'
import type {
  CatalogItemInput,
  Charge,
  CreateSubscriptionInput,
  CustomerSubscription,
  Payment,
  PaymentInput,
  ServiceCatalogItem,
  SubscriptionInput,
} from '../../../types/subscription.types'
import { organizationPath } from '../../organizations'

const root = (organizationId: string) => `${organizationPath(organizationId)}services/`

export const subscriptionService = {
  listCatalog: (organizationId: string, signal?: AbortSignal) =>
    request<ServiceCatalogItem[]>(`${root(organizationId)}catalog/`, {
      signal,
      schema: catalogItemContract.array(),
    }),
  createCatalogItem: (organizationId: string, body: CatalogItemInput) =>
    request<ServiceCatalogItem>(`${root(organizationId)}catalog/`, { method: 'POST', body }),
  updateCatalogItem: (organizationId: string, id: string, body: Partial<CatalogItemInput>) =>
    request<ServiceCatalogItem>(`${root(organizationId)}catalog/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body,
    }),
  listSubscriptions: (organizationId: string, signal?: AbortSignal) =>
    request<CustomerSubscription[]>(`${root(organizationId)}subscriptions/`, {
      signal,
      schema: customerSubscriptionContract.array(),
    }),
  createSubscription: (organizationId: string, body: CreateSubscriptionInput) =>
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
      `${root(organizationId)}subscriptions/${encodeURIComponent(id)}/end/`,
      { method: 'POST', body: { mode } },
    ),
  resumeSubscription: (organizationId: string, id: string) =>
    request<CustomerSubscription>(
      `${root(organizationId)}subscriptions/${encodeURIComponent(id)}/resume/`,
      { method: 'POST' },
    ),
  pauseSubscription: (organizationId: string, id: string) =>
    request<CustomerSubscription>(
      `${root(organizationId)}subscriptions/${encodeURIComponent(id)}/pause/`,
      { method: 'POST' },
    ),
  overview: (organizationId: string, signal?: AbortSignal) =>
    request(`${root(organizationId)}overview/`, {
      signal,
      schema: subscriptionOverviewContract,
    }),
  listCharges: (organizationId: string, signal?: AbortSignal) =>
    request<Charge[]>(`${root(organizationId)}charges/`, {
      signal,
      schema: chargeContract.array(),
    }),
  recordPayment: (organizationId: string, chargeId: string, body: PaymentInput) =>
    request<Payment>(`${root(organizationId)}charges/${encodeURIComponent(chargeId)}/payments/`, {
      method: 'POST',
      body,
    }),
}
