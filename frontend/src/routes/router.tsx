import { createRootRoute, createRoute, createRouter, Link, lazyRouteComponent, redirect } from '@tanstack/react-router'
import { Button, Stack, Typography } from '@mui/material'
import { RootLayout, WorkspaceLayout } from '../components/layout/AppLayout'
import { useAuthStore } from '../features/auth'
const root = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <Stack spacing={2}><Typography variant="h4">Page not found</Typography><Button component={Link} to="/">Back to workspaces</Button></Stack>,
})
const home = createRoute({ getParentRoute: () => root, path: '/', component: lazyRouteComponent(() => import('../pages/Organizations/OrganizationsPage'), 'OrganizationsPage') })
const login = createRoute({ getParentRoute: () => root, path: '/login', beforeLoad: () => { throw redirect({ to: '/', replace: true }) } })
const invite = createRoute({ getParentRoute: () => root, path: '/invite/$token', component: lazyRouteComponent(() => import('../pages/Invite/InvitePage'), 'InvitePage') })
const workspace = createRoute({
  getParentRoute: () => root,
  path: '/organizations/$organizationId',
  component: WorkspaceLayout,
  beforeLoad: () => {
    if (!useAuthStore.getState().accessToken) throw redirect({ to: '/' })
  },
})
const overview = createRoute({ getParentRoute: () => workspace, path: '/', component: lazyRouteComponent(() => import('../pages/Dashboard/DashboardPage'), 'DashboardPage') })
const companies = createRoute({ getParentRoute: () => workspace, path: '/companies', component: lazyRouteComponent(() => import('../pages/Companies/CompaniesPage'), 'CompaniesPage') })
const contacts = createRoute({ getParentRoute: () => workspace, path: '/contacts', component: lazyRouteComponent(() => import('../pages/Contacts/ContactsPage'), 'ContactsPage') })
const automations = createRoute({ getParentRoute: () => workspace, path: '/automations', component: lazyRouteComponent(() => import('../pages/Automations/AutomationsPage'), 'AutomationsPage') })
const members = createRoute({ getParentRoute: () => workspace, path: '/members', component: lazyRouteComponent(() => import('../pages/Members/MembersPage'), 'MembersPage') })
export const router = createRouter({ routeTree: root.addChildren([home, login, invite, workspace.addChildren([overview, companies, contacts, automations, members])]) })
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
