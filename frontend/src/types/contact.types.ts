export interface Contact {
  id: string
  organization: string
  company: string
  company_name: string
  assigned_to: number | null
  assigned_to_name: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  department: string
  job_title: string
  status: 'active' | 'former'
  is_primary: boolean
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type ContactInput = Omit<
  Contact,
  'id' | 'organization' | 'company_name' | 'assigned_to_name' | 'created_at' | 'updated_at' | 'archived_at'
>

export interface ContactActivity {
  id: string
  action: 'created' | 'updated' | 'assigned' | 'archived' | 'restored'
  actor_name: string
  details: { fields?: string[] }
  created_at: string
}
