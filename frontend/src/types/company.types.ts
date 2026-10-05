export interface Company {
  id: string
  organization: string
  name: string
  tax_id: string
  industry: string
  email: string
  phone_number: string
  website: string
  address_line_1: string
  address_line_2: string
  city: string
  postal_code: string
  country: string
  notes: string
  lifecycle_stage: 'lead' | 'prospect' | 'customer' | 'inactive'
  created_at: string
  updated_at: string
}

export type CompanyInput = Omit<Company, 'id' | 'organization' | 'created_at' | 'updated_at'>
