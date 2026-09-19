export interface Company {
  id: string
  organization: string
  name: string
  email: string
  phone_number: string
  website: string
  lifecycle_stage: 'lead' | 'prospect' | 'customer' | 'inactive'
}
