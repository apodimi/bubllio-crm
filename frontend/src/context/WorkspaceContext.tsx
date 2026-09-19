import { createContext, useContext } from 'react'
import type { Organization } from '../types/organization.types'

export const WorkspaceContext = createContext<Organization | null>(null)

export function useWorkspace() {
  const organization = useContext(WorkspaceContext)
  if (!organization) throw new Error('Workspace route required')
  return organization
}

export function canCreateRecords(organization: Organization) {
  return organization.current_user_role === null || ['owner', 'admin', 'member'].includes(organization.current_user_role)
}
