export interface Company {
  id: string
  organization: string
  customer_code: string
  assigned_to: number | null
  assigned_to_name: string
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
  archived_at: string | null
}

export type CompanyInput = Omit<
  Company,
  | 'id'
  | 'organization'
  | 'customer_code'
  | 'assigned_to_name'
  | 'created_at'
  | 'updated_at'
  | 'archived_at'
>

export interface CompanyActivity {
  id: string
  action: 'created' | 'updated' | 'assigned' | 'contact_added' | 'archived' | 'restored'
  actor_name: string
  details: { fields?: string[]; contact_name?: string }
  created_at: string
}
