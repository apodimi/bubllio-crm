import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import DashboardRounded from '@mui/icons-material/DashboardRounded'
import BusinessRounded from '@mui/icons-material/BusinessRounded'
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded'
import GroupAddRounded from '@mui/icons-material/GroupAddRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import BoltRounded from '@mui/icons-material/BoltRounded'
import { BrandLogo } from '../common/BrandLogo'

type SidebarProps = {
  organizationId?: string
  organizations: Array<{ id: string; name: string }>
  currentPath: string
  username: string | null
  isSuperuser: boolean
  currentRole?: string | null
  onOrganizationChange: (organizationId: string) => void
  onClose: () => void
}

type NavigationItem = {
  text: string
  to:
    | '/organizations/$organizationId'
    | '/organizations/$organizationId/companies'
    | '/organizations/$organizationId/contacts'
    | '/organizations/$organizationId/automations'
    | '/organizations/$organizationId/members'
    | '/organizations/$organizationId/settings'
  path: string
  icon: ReactNode
}

export function WorkspaceSidebar({
  organizationId,
  organizations,
  currentPath,
  username,
  isSuperuser,
  currentRole,
  onOrganizationChange,
  onClose,
}: SidebarProps) {
  const canManageWorkspace = isSuperuser || currentRole === 'owner' || currentRole === 'admin'
  const basePath = organizationId ? `/organizations/${organizationId}` : ''
  const navigationItems: NavigationItem[] = [
    {
      text: 'Overview',
      to: '/organizations/$organizationId',
      path: basePath,
      icon: <DashboardRounded />,
    },
    {
      text: 'Companies',
      to: '/organizations/$organizationId/companies',
      path: `${basePath}/companies`,
      icon: <BusinessRounded />,
    },
    {
      text: 'Contacts',
      to: '/organizations/$organizationId/contacts',
      path: `${basePath}/contacts`,
      icon: <PeopleAltRounded />,
    },
    {
      text: 'Automations',
      to: '/organizations/$organizationId/automations',
      path: `${basePath}/automations`,
      icon: <BoltRounded />,
    },
    ...(canManageWorkspace
      ? [
          {
            text: 'People',
            to: '/organizations/$organizationId/members' as const,
            path: `${basePath}/members`,
            icon: <GroupAddRounded />,
          },
          {
            text: 'Settings',
            to: '/organizations/$organizationId/settings' as const,
            path: `${basePath}/settings`,
            icon: <SettingsRounded />,
          },
        ]
      : []),
  ]

  return (
    <Stack sx={{ height: '100%', p: 2.5 }}>
      <Box
        component={Link}
        to="/"
        aria-label="Bubllio home"
        sx={{ alignSelf: 'flex-start', textDecoration: 'none', mx: 1, mt: 1, mb: 4 }}
      >
        <BrandLogo product="CRM" />
      </Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1, mb: 1 }}>
        WORKSPACE
      </Typography>
      <Select
        size="small"
        displayEmpty
        value={
          organizations.some((organization) => organization.id === organizationId)
            ? organizationId
            : ''
        }
        inputProps={{ 'aria-label': 'Select workspace' }}
        onChange={(event) => onOrganizationChange(event.target.value)}
        sx={{ mb: 3 }}
      >
        <MenuItem value="" disabled>
          Select workspace
        </MenuItem>
        {organizations.map((organization) => (
          <MenuItem value={organization.id} key={organization.id}>
            {organization.name}
          </MenuItem>
        ))}
      </Select>
      <List>
        {organizationId &&
          navigationItems.map((item) => (
            <Link
              to={item.to}
              params={{ organizationId }}
              key={item.text}
              style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
              onClick={onClose}
            >
              <ListItemButton
                component="div"
                selected={currentPath === item.path || currentPath === `${item.path}/`}
                sx={{ mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.text}
                  slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 550 } } }}
                />
              </ListItemButton>
            </Link>
          ))}
      </List>
      <Button
        component={Link}
        to="/"
        onClick={onClose}
        sx={{ justifyContent: 'flex-start', px: 2 }}
      >
        All workspaces
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary" noWrap sx={{ px: 1 }}>
        Signed in as {username}
      </Typography>
    </Stack>
  )
}
