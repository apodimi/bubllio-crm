export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export interface Deal {
  id: string
  organization: string
  company: string
  company_name: string
  contact: string | null
  contact_name: string
  assigned_to: number | null
  assigned_to_name: string
  title: string
  value: string
  currency: string
  tax_rate: string
  amount_includes_tax: boolean
  net_value: string
  tax_value: string
  gross_value: string
  probability: number
  stage: DealStage
  sort_order: number
  expected_close_date: string | null
  lost_reason: string
  notes: string
  archived_at: string | null
  created_at: string
  updated_at: string
}
