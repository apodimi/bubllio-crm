export interface Collaborator {
  id: string
  name: string
  specialty: string
  email: string
  phone_number: string
  notes: string
  is_active: boolean
  service_count?: number
  created_at?: string
  updated_at?: string
}

export interface CollaboratorInput {
  name: string
  specialty: string
  email: string
  phone_number: string
  notes: string
  is_active: boolean
}

export interface CollaboratorService {
  id: string
  collaborator: string
  collaborator_name?: string
  name: string
  default_cost: string
  currency: string
  description: string
  is_active: boolean
}

export interface CollaboratorServiceInput {
  collaborator: string
  name: string
  default_cost: string
  currency: string
  description: string
  is_active: boolean
}

export type DealCostStatus = 'estimated' | 'committed' | 'paid' | 'cancelled'

export interface DealCost {
  id: string
  deal: string
  collaborator: string
  collaborator_name: string
  collaborator_service: string | null
  service_name: string
  description: string
  quantity: string
  unit_cost: string
  currency: string
  total_cost: string
  status: DealCostStatus
}

export interface DealCostInput {
  collaborator: string
  collaborator_service: string | null
  service_name: string
  description: string
  quantity: string
  unit_cost: string
  currency: string
  status: DealCostStatus
}

export interface DealProfitability {
  deal: string
  currency: string
  net_revenue: string
  estimated_cost_total: string
  committed_cost_total: string
  estimated_gross_profit: string
  estimated_margin_percent: string | null
  costs?: DealCost[]
  lines?: DealCost[]
}
