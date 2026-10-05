export interface Contact {
  id: string
  organization: string
  company: string
  company_name: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  department: string
  job_title: string
  created_at: string
  updated_at: string
}

export type ContactInput = Omit<
  Contact,
  'id' | 'organization' | 'company_name' | 'created_at' | 'updated_at'
>
