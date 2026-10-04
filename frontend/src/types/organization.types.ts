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
