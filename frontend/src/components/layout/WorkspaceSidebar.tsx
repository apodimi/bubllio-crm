import { Stack } from '@mui/material'
import type { ActivityInboxItem } from '../../types/activityInbox.types'

import { WorkspaceSidebarHeader } from './WorkspaceSidebarHeader'
import { WorkspaceSidebarNavigation } from './WorkspaceSidebarNavigation'
import { WorkspaceSidebarSelector } from './WorkspaceSidebarSelector'

type SidebarProps = {
  organizationId?: string
  organizations: Array<{ id: string; name: string }>
  currentPath: string
  username: string | null
  isSuperuser: boolean
  currentRole?: string | null
  onOrganizationChange: (organizationId: string) => void
  onClose: () => void
  expanded: boolean
  onToggle?: () => void
  showNestedNavigation?: boolean
  showWorkspaceSelector?: boolean
  inboxCount: number
  inboxItems?: ActivityInboxItem[]
}

export function WorkspaceSidebar({
  organizationId,
  organizations,
  currentPath,
  isSuperuser,
  currentRole,
  onOrganizationChange,
  onClose,
  expanded,
  onToggle,
  showNestedNavigation = false,
  showWorkspaceSelector = true,
  inboxCount,
  inboxItems,
}: SidebarProps) {
  return (
    <Stack
      sx={{
        height: '100%',
        minHeight: 0,
        px: expanded ? 2 : 1,
        py: expanded ? 2 : 1.5,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderInlineEnd: 1,
        borderColor: 'divider',
      }}
    >
      <WorkspaceSidebarHeader expanded={expanded} onToggle={onToggle} />
      {showWorkspaceSelector ? (
        <WorkspaceSidebarSelector
          organizationId={organizationId}
          organizations={organizations}
          expanded={expanded}
          onOrganizationChange={onOrganizationChange}
          onClose={onClose}
        />
      ) : null}
      <WorkspaceSidebarNavigation
        organizationId={organizationId}
        currentPath={currentPath}
        isSuperuser={isSuperuser}
        currentRole={currentRole}
        expanded={expanded}
        showNestedNavigation={showNestedNavigation}
        onClose={onClose}
        inboxCount={inboxCount}
        inboxItems={inboxItems}
      />
    </Stack>
  )
}
