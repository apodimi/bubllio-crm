import inboxIcon from '@iconify-icons/keyline-icons/inbox'
import menuIcon from '@iconify-icons/keyline-icons/menu'
import { Link } from '@tanstack/react-router'
import { Box, IconButton, Stack, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { GlobalSearch } from '../../features/global-search'
import type { ActivityInboxItem } from '../../types/activityInbox.types'
import { AppIcon } from '../common/AppIcon'
import { ActivityInboxIndicator } from './ActivityInboxIndicator'
import { AccountMenu, WorkspacePicker, type WorkspaceOption } from './WorkspaceHeaderMenus'

type WorkspaceHeaderProps = {
  organizationId?: string
  workspaceName?: string
  organizations: WorkspaceOption[]
  onOrganizationChange: (organizationId: string) => void
  onOpenNavigation: () => void
  username: string | null
  isSuperuser: boolean
  currentRole?: string | null
  onLogout: () => void
  inboxCount: number
  inboxItems?: ActivityInboxItem[]
}

export function WorkspaceHeader({
  organizationId,
  workspaceName,
  organizations,
  onOrganizationChange,
  onOpenNavigation,
  username,
  isSuperuser,
  currentRole,
  onLogout,
  inboxCount,
  inboxItems,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation()
  const canManageWorkspace = isSuperuser || currentRole === 'owner' || currentRole === 'admin'

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 'appBar', bgcolor: 'background.default' }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, md: 3, lg: 4.5 },
          minHeight: { xs: 64, md: 80 },
        }}
      >
        <Stack direction="row" sx={{ gap: { xs: 0.25, sm: 1 }, alignItems: 'center', minWidth: 0 }}>
          <IconButton
            aria-label={t('navigation.openNavigation')}
            onClick={onOpenNavigation}
            sx={{ display: { md: 'none' } }}
          >
            <AppIcon icon={menuIcon} />
          </IconButton>
          <WorkspacePicker
            organizationId={organizationId}
            workspaceName={workspaceName}
            organizations={organizations}
            onOrganizationChange={onOrganizationChange}
          />
        </Stack>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', flexShrink: 0, gap: { xs: 0.25, sm: 1.25 } }}
        >
          <GlobalSearch
            currentOrganizationId={organizationId}
            currentWorkspaceName={workspaceName}
          />
          {organizationId ? (
            <Tooltip title={t('navigation.inbox')}>
              <Link
                to="/organizations/$organizationId/inbox"
                params={{ organizationId }}
                aria-label={t('navigation.inboxWithCount', { count: inboxCount })}
                style={{
                  alignItems: 'center',
                  color: 'inherit',
                  display: 'inline-flex',
                  height: 44,
                  justifyContent: 'center',
                  textDecoration: 'none',
                  width: 44,
                }}
              >
                <ActivityInboxIndicator count={inboxCount} items={inboxItems}>
                  <AppIcon icon={inboxIcon} />
                </ActivityInboxIndicator>
              </Link>
            </Tooltip>
          ) : null}
          <AccountMenu
            organizationId={organizationId}
            workspaceName={workspaceName}
            username={username}
            isSuperuser={isSuperuser}
            canManageWorkspace={canManageWorkspace}
            onLogout={onLogout}
          />
        </Stack>
      </Stack>
    </Box>
  )
}
