import { lazy, Suspense, useEffect, useState } from 'react'
import { BottomNavigation, BottomNavigationAction, Box, Drawer, Paper } from '@mui/material'
import { Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../features/auth'
import { useAuthStore } from '../../features/auth/store/authStore'
import { useOrganization, useOrganizations, WorkspaceContext } from '../../features/organizations'
import { useSetupStatus } from '../../features/setup/hooks/useSetup'
import { UpdateBanner } from '../../features/updates/components/UpdateBanner'
import { Failure, Loading } from '../common/Feedback'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import {
  selectedMobileNavigation,
  workspaceNavigation,
  type WorkspaceNavigationKey,
} from './workspaceNavigation'

const LoginPage = lazy(() =>
  import('../../pages/Login/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const SetupPage = lazy(() =>
  import('../../pages/Setup/SetupPage').then((module) => ({ default: module.SetupPage })),
)

export function RootLayout() {
  const auth = useAuth()
  const setup = useSetupStatus()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (setup.isPending) return <Loading />
  if (setup.isError) return <Failure error={setup.error} retry={() => void setup.refetch()} />
  if (setup.data.available) {
    return (
      <Suspense fallback={<Loading />}>
        <SetupPage
          onComplete={() => {
            void navigate({ to: '/', replace: true })
            void setup.refetch()
          }}
        />
      </Suspense>
    )
  }
  if (
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/installation-admin-invite/') ||
    pathname.startsWith('/reset-password')
  )
    return <Outlet />
  return auth.username ? (
    <Shell />
  ) : (
    <Suspense fallback={<Loading />}>
      <LoginPage />
    </Suspense>
  )
}

function Shell() {
  const { t } = useTranslation()
  const auth = useAuth()
  const isSuperuser = useAuthStore((state) => state.user?.is_superuser ?? false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopNavigationExpanded, setDesktopNavigationExpanded] = useState(true)
  const params = useParams({ strict: false })
  const organizationId = 'organizationId' in params ? params.organizationId : undefined
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const organizations = useOrganizations()
  const navigate = useNavigate()
  const currentOrganization = organizations.data?.find(
    (organization) => organization.id === organizationId,
  )

  useEffect(() => {
    if (organizationId && organizations.isSuccess && !currentOrganization) {
      void navigate({ to: '/', replace: true })
    }
  }, [currentOrganization, navigate, organizationId, organizations.isSuccess])

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

  const desktopSidebar = (
    <WorkspaceSidebar
      organizationId={organizationId}
      organizations={organizations.data ?? []}
      currentPath={pathname}
      username={auth.username}
      isSuperuser={isSuperuser}
      currentRole={currentOrganization?.current_user_role}
      onOrganizationChange={selectOrganization}
      onClose={closeMobileNavigation}
      expanded={desktopNavigationExpanded}
      onToggle={() => setDesktopNavigationExpanded((expanded) => !expanded)}
      showNestedNavigation
      showWorkspaceSelector={false}
    />
  )

  const mobileSidebar = (
    <WorkspaceSidebar
      organizationId={organizationId}
      organizations={organizations.data ?? []}
      currentPath={pathname}
      username={auth.username}
      isSuperuser={isSuperuser}
      currentRole={currentOrganization?.current_user_role}
      onOrganizationChange={selectOrganization}
      onClose={closeMobileNavigation}
      expanded
      showNestedNavigation
    />
  )

  const desktopNavigationWidth = desktopNavigationExpanded ? 248 : 72
  const isWorkspaceDashboard = Boolean(
    organizationId &&
    (pathname === `/organizations/${organizationId}` ||
      pathname === `/organizations/${organizationId}/`),
  )
  const mobileNavigationValue = selectedMobileNavigation(pathname, organizationId)
  const mobileNavigationItems = workspaceNavigation.filter((item) => item.mobile)

  function navigateFromMobileDock(value: WorkspaceNavigationKey) {
    if (!organizationId) {
      return
    }
    const item = mobileNavigationItems.find((candidate) => candidate.key === value)
    if (item) {
      void navigate({ to: item.route, params: { organizationId } })
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 'tooltip',
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          textDecoration: 'none',
          transform: 'translateY(-160%)',
          transition: (theme) => theme.transitions.create('transform'),
          '&:focus': { transform: 'translateY(0)' },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        {t('common.skipToContent')}
      </Box>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: desktopNavigationWidth,
          flexShrink: 0,
          transition: (theme) =>
            theme.transitions.create('width', {
              duration: theme.transitions.duration.shorter,
              easing: theme.transitions.easing.easeOut,
            }),
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          '& .MuiDrawer-paper': {
            width: desktopNavigationWidth,
            bgcolor: 'transparent',
            color: 'text.primary',
            borderRight: 0,
            overflowX: 'hidden',
            transition: (theme) =>
              theme.transitions.create('width', {
                duration: theme.transitions.duration.shorter,
                easing: theme.transitions.easing.easeOut,
              }),
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          },
        }}
      >
        {desktopSidebar}
      </Drawer>
      <Drawer
        open={mobileOpen}
        onClose={closeMobileNavigation}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: 'min(280px, calc(100vw - 24px))', sm: 280 },
            maxWidth: '100%',
            bgcolor: 'background.default',
            color: 'text.primary',
            overscrollBehavior: 'contain',
          },
        }}
      >
        {mobileSidebar}
      </Drawer>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          overflowX: 'clip',
          bgcolor: 'background.default',
        }}
      >
        <WorkspaceHeader
          organizationId={currentOrganization?.id}
          workspaceName={currentOrganization?.name}
          organizations={organizations.data ?? []}
          onOrganizationChange={selectOrganization}
          onOpenNavigation={() => setMobileOpen(true)}
          username={auth.username}
          isSuperuser={isSuperuser}
          onLogout={auth.logout}
        />
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            px: isWorkspaceDashboard ? 0 : { xs: 1.5, sm: 3, lg: 4.5 },
            pt: isWorkspaceDashboard ? 0 : { xs: 2, md: 3 },
            pb: isWorkspaceDashboard
              ? { xs: 'calc(92px + env(safe-area-inset-bottom))', md: 0 }
              : { xs: 'calc(104px + env(safe-area-inset-bottom))', md: 6 },
            width: '100%',
            maxWidth: isWorkspaceDashboard ? 'none' : 1600,
            mx: 'auto',
            outline: 'none',
          }}
        >
          <Box sx={{ px: isWorkspaceDashboard ? { xs: 1.5, sm: 3, lg: 4.5 } : 0 }}>
            <UpdateBanner isInstallationAdmin={isSuperuser} />
          </Box>
          <Outlet />
        </Box>
        {organizationId ? (
          <Paper
            component="nav"
            aria-label={t('navigation.primaryNavigation')}
            elevation={3}
            sx={{
              position: 'fixed',
              zIndex: 'appBar',
              right: 1.5,
              bottom: 'max(12px, env(safe-area-inset-bottom))',
              left: 1.5,
              display: { xs: 'block', md: 'none' },
              overflow: 'hidden',
              borderRadius: 2.5,
            }}
          >
            <BottomNavigation
              value={mobileNavigationValue}
              onChange={(_event, value: WorkspaceNavigationKey) => navigateFromMobileDock(value)}
              sx={{
                height: 64,
                bgcolor: 'background.paper',
                '& .MuiBottomNavigationAction-root': {
                  minWidth: 0,
                  minHeight: 44,
                  color: 'text.secondary',
                  borderRadius: 1.75,
                  mx: 0.25,
                  py: 0.75,
                },
                '&& .MuiBottomNavigationAction-root.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                },
                '&& .MuiBottomNavigationAction-root.Mui-selected svg': { color: 'inherit' },
                '& .MuiBottomNavigationAction-label': {
                  display: 'block',
                  mt: 0.25,
                  fontSize: '0.625rem',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                },
                '& .MuiBottomNavigationAction-label.Mui-selected': { fontSize: '0.625rem' },
              }}
            >
              {mobileNavigationItems.map((item) => (
                <BottomNavigationAction
                  key={item.key}
                  aria-label={t(item.mobileLabelKey ?? item.labelKey)}
                  label={t(item.mobileLabelKey ?? item.labelKey)}
                  value={item.key}
                  icon={item.icon}
                />
              ))}
            </BottomNavigation>
          </Paper>
        ) : null}
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
