import { createContext, useContext } from 'react'
import type { Organization } from '../api/types'
export const WorkspaceContext = createContext<Organization | null>(null)
export function useWorkspace() {
  const org = useContext(WorkspaceContext)
  if (!org) throw new Error('Workspace route required')
  return org
}
export function canCreateRecords(org: Organization) {
  return org.current_user_role === null || ['owner', 'admin', 'member'].includes(org.current_user_role)
}
