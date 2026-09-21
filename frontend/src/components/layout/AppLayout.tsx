import { useState } from 'react'
import { Link, Outlet, useParams, useRouterState } from '@tanstack/react-router'
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
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
import MenuRounded from '@mui/icons-material/MenuRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import { useAuth } from '../../features/auth'
import { useAuthStore } from '../../features/auth/store/authStore'
import { useOrganization, useOrganizations, WorkspaceContext } from '../../features/organizations'
import { LoginPage } from '../../pages/Login/LoginPage'
import { Failure, Loading } from '../common/Feedback'
import { BrandLogo } from '../common/BrandLogo'
import { useNavigate } from '@tanstack/react-router'
import { useSetupStatus } from '../../features/setup/hooks/useSetup'
import { SetupPage } from '../../pages/Setup/SetupPage'

export function RootLayout() {
  const auth = useAuth()
  const setup = useSetupStatus()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (setup.isPending) return <Loading />
  if (setup.isError) return <Failure error={setup.error} retry={() => void setup.refetch()} />
  if (setup.data.available)
    return (
      <SetupPage
        onComplete={() => {
          void navigate({ to: '/', replace: true })
          void setup.refetch()
        }}
      />
    )
  if (pathname.startsWith('/invite/')) return <Outlet />
  return auth.username ? <Shell /> : <LoginPage />
}
function Shell() {
  const auth = useAuth()
  const isSuperuser = useAuthStore((state) => state.user?.is_superuser ?? false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const params = useParams({ strict: false })
  const orgId = 'organizationId' in params ? params.organizationId : undefined
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const orgs = useOrganizations()
  const navigate = useNavigate()
  const base = orgId ? '/organizations/' + orgId : ''
  const currentRole = orgs.data?.find((org) => org.id === orgId)?.current_user_role
  const items = [
    {
      text: 'Overview',
      to: '/organizations/$organizationId' as const,
      path: base,
      icon: <DashboardRounded />,
    },
    {
      text: 'Companies',
      to: '/organizations/$organizationId/companies' as const,
      path: base + '/companies',
      icon: <BusinessRounded />,
    },
    {
      text: 'Contacts',
      to: '/organizations/$organizationId/contacts' as const,
      path: base + '/contacts',
      icon: <PeopleAltRounded />,
    },
    {
      text: 'Automations',
      to: '/organizations/$organizationId/automations' as const,
      path: base + '/automations',
      icon: <BoltRounded />,
    },
    ...(isSuperuser || currentRole === 'owner' || currentRole === 'admin'
      ? [
          {
            text: 'People',
            to: '/organizations/$organizationId/members' as const,
            path: base + '/members',
            icon: <GroupAddRounded />,
          },
        ]
      : []),
    ...(isSuperuser || currentRole === 'owner' || currentRole === 'admin'
      ? [
          {
            text: 'Settings',
            to: '/organizations/$organizationId/settings' as const,
            path: base + '/settings',
            icon: <SettingsRounded />,
          },
        ]
      : []),
  ]
  const sidebar = (
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
        value={orgs.data?.some((org) => org.id === orgId) ? orgId : ''}
        inputProps={{ 'aria-label': 'Select workspace' }}
        onChange={(event) => {
          setMobileOpen(false)
          void navigate({
            to: '/organizations/$organizationId',
            params: { organizationId: event.target.value },
          })
        }}
        sx={{ mb: 3 }}
      >
        <MenuItem value="" disabled>
          Select workspace
        </MenuItem>
        {(orgs.data ?? []).map((org) => (
          <MenuItem value={org.id} key={org.id}>
            {org.name}
          </MenuItem>
        ))}
      </Select>
      <List>
        {orgId &&
          items.map((item) => (
            <Link
              to={item.to}
              params={{ organizationId: orgId }}
              key={item.text}
              style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemButton
                component="div"
                selected={pathname === item.path || pathname === item.path + '/'}
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
        onClick={() => setMobileOpen(false)}
        sx={{ justifyContent: 'flex-start', px: 2 }}
      >
        All workspaces
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ my: 2 }} />
      <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 36, height: 36 }}>
          {auth.username?.slice(0, 1).toUpperCase()}
        </Avatar>
        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
          {auth.username}
        </Typography>
        <IconButton aria-label="Sign out" onClick={auth.logout}>
          <LogoutRounded fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  )
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 248,
          '& .MuiDrawer-paper': { width: 248, bgcolor: 'background.paper' },
        }}
      >
        {sidebar}
      </Drawer>
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 270 } }}
      >
        {sidebar}
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, md: 5 },
            py: 2.5,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <IconButton
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuRounded />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Workspace <span style={{ margin: '0 12px', opacity: 0.4 }}>/</span>{' '}
              {orgs.data?.find((org) => org.id === orgId)?.name ?? 'All workspaces'}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            BUBLLIO CRM
          </Typography>
        </Stack>
        <Box
          component="main"
          sx={{ px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 3, md: 5 }, maxWidth: 1500, mx: 'auto' }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
export function WorkspaceLayout() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' })
  const query = useOrganization(organizationId)
  if (query.isPending) return <Loading />
  if (query.isError) return <Failure error={query.error} retry={() => void query.refetch()} />
  return (
    <WorkspaceContext.Provider value={query.data}>
      <Outlet key={organizationId} />
    </WorkspaceContext.Provider>
  )
}
