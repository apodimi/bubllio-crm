export interface Organization {
  id: string
  name: string
  slug: string
  is_personal: boolean
  current_user_role: 'owner' | 'admin' | 'member' | 'viewer' | null
}
