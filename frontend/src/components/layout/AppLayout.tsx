import { useState } from 'react'
import { Box, Drawer } from '@mui/material'
import { Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../../features/auth'
import { useAuthStore } from '../../features/auth/store/authStore'
import { useOrganization, useOrganizations, WorkspaceContext } from '../../features/organizations'
import { LoginPage } from '../../pages/Login/LoginPage'
import { SetupPage } from '../../pages/Setup/SetupPage'
import { useSetupStatus } from '../../features/setup/hooks/useSetup'
import { UpdateBanner } from '../../features/updates/components/UpdateBanner'
import { Failure, Loading } from '../common/Feedback'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceSidebar } from './WorkspaceSidebar'

export function RootLayout() {
  const auth = useAuth()
  const setup = useSetupStatus()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (setup.isPending) return <Loading />
  if (setup.isError) return <Failure error={setup.error} retry={() => void setup.refetch()} />
  if (setup.data.available) {
    return (
      <SetupPage
        onComplete={() => {
          void navigate({ to: '/', replace: true })
          void setup.refetch()
        }}
      />
    )
  }
  if (
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/installation-admin-invite/') ||
    pathname.startsWith('/reset-password')
  )
    return <Outlet />
  return auth.username ? <Shell /> : <LoginPage />
}

function Shell() {
  const auth = useAuth()
  const isSuperuser = useAuthStore((state) => state.user?.is_superuser ?? false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const params = useParams({ strict: false })
  const organizationId = 'organizationId' in params ? params.organizationId : undefined
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const organizations = useOrganizations()
  const navigate = useNavigate()
  const currentOrganization = organizations.data?.find(
    (organization) => organization.id === organizationId,
  )

  function closeMobileNavigation() {
    setMobileOpen(false)
  }

  function selectOrganization(nextOrganizationId: string) {
    closeMobileNavigation()
    void navigate({
      to: '/organizations/$organizationId',
      params: { organizationId: nextOrganizationId },
    })
  }

  const sidebar = (
    <WorkspaceSidebar
      organizationId={organizationId}
      organizations={organizations.data ?? []}
      currentPath={pathname}
      username={auth.username}
      isSuperuser={isSuperuser}
      currentRole={currentOrganization?.current_user_role}
      onOrganizationChange={selectOrganization}
      onClose={closeMobileNavigation}
    />
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 264,
          '& .MuiDrawer-paper': {
            width: 264,
            bgcolor: '#eef4ff',
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.86), rgba(234,242,255,.92))',
            boxShadow: '8px 0 32px rgba(15,31,56,.045)',
          },
        }}
      >
        {sidebar}
      </Drawer>
      <Drawer
        open={mobileOpen}
        onClose={closeMobileNavigation}
        sx={{ '& .MuiDrawer-paper': { width: 286, bgcolor: '#eef4ff' } }}
      >
        {sidebar}
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <WorkspaceHeader
          workspaceName={currentOrganization?.name}
          onOpenNavigation={() => setMobileOpen(true)}
          username={auth.username}
          isSuperuser={isSuperuser}
          onLogout={auth.logout}
        />
        <Box
          component="main"
          sx={{ px: { xs: 2, sm: 3.5, lg: 6 }, pt: { xs: 3, md: 5 }, pb: { xs: 6, md: 8 }, maxWidth: 1500, mx: 'auto' }}
        >
          <UpdateBanner isInstallationAdmin={isSuperuser} />
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
