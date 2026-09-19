export interface Organization {
  id: string
  name: string
  slug: string
  current_user_role: 'owner' | 'admin' | 'member' | 'viewer' | null
}
