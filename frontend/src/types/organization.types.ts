export interface Organization {
  id: string
  name: string
  slug: string
  is_personal: boolean
  current_user_role: 'owner' | 'admin' | 'member' | 'viewer' | null
}

export interface EmailAccount {
  id: string
  name: string
  provider: 'smtp'
  host: string
  port: number
  username: string
  use_tls: boolean
  use_ssl: boolean
  from_email: string
  from_name: string
  is_default: boolean
  is_active: boolean
  last_tested_at: string | null
  last_test_error: string
  created_at: string
  updated_at: string
}

export interface WorkspaceSettings {
  timezone: string
  locale: string
  default_from_name: string
  legal_name: string
  trading_name: string
  tax_id: string
  tax_office: string
  registration_number: string
  business_email: string
  phone: string
  website: string
  address_line_1: string
  address_line_2: string
  city: string
  postal_code: string
  country: string
  currency: string
  fiscal_year_start_month: number
  default_tax_rate: string
  default_payment_terms_days: number
  document_prefix: string
  next_document_number: number
}

export interface WorkspaceActivityEvent {
  id: number
  action: string
  actor: string
  target: string | null
  details: Record<string, unknown>
  created_at: string
}
