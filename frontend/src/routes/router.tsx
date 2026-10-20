import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { Button, Stack, Typography } from '@mui/material'
import { RootLayout, WorkspaceLayout } from '../components/layout/AppLayout'
import { useAuthStore } from '../features/auth'
import { useTranslation } from 'react-i18next'
import { parseCompanySearch } from '../features/companies/companyListConfig'
import { parseContactSearch } from '../features/contacts/contactListConfig'
import { parseDealSearch } from '../features/deals/dealBoardConfig'
import { parseTaskSearch } from '../features/tasks/taskSearchConfig'

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('errors.pageNotFound')}</Typography>
      <Button component={Link} to="/">
        {t('errors.backToWorkspaces')}
      </Button>
    </Stack>
  )
}
const root = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})
const home = createRoute({
  getParentRoute: () => root,
  path: '/',
  component: lazyRouteComponent(
    () => import('../pages/Organizations/OrganizationsPage'),
    'OrganizationsPage',
  ),
})
const login = createRoute({
  getParentRoute: () => root,
  path: '/login',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true })
  },
})
const invite = createRoute({
  getParentRoute: () => root,
  path: '/invite/$token',
  component: lazyRouteComponent(() => import('../pages/Invite/InvitePage'), 'InvitePage'),
})
const installationAdminInvite = createRoute({
  getParentRoute: () => root,
  path: '/installation-admin-invite/$token',
  component: lazyRouteComponent(
    () => import('../pages/Invite/InvitePage'),
    'InstallationAdminInvitePage',
  ),
})
const passwordReset = createRoute({
  getParentRoute: () => root,
  path: '/reset-password',
  component: lazyRouteComponent(
    () => import('../pages/ResetPassword/ResetPasswordPage'),
    'ResetPasswordPage',
  ),
})
const passwordResetConfirm = createRoute({
  getParentRoute: () => root,
  path: '/reset-password/$uid/$token',
  component: lazyRouteComponent(
    () => import('../pages/ResetPassword/ResetPasswordPage'),
    'ResetPasswordPage',
  ),
})
const accountSettings = createRoute({
  getParentRoute: () => root,
  path: '/account/settings',
  beforeLoad: () => {
    if (!useAuthStore.getState().accessToken) throw redirect({ to: '/' })
  },
  component: lazyRouteComponent(
    () => import('../pages/AccountSettings/AccountSettingsPage'),
    'AccountSettingsPage',
  ),
})
const workspace = createRoute({
  getParentRoute: () => root,
  path: '/organizations/$organizationId',
  component: WorkspaceLayout,
  beforeLoad: () => {
    if (!useAuthStore.getState().accessToken) throw redirect({ to: '/' })
  },
})
const overview = createRoute({
  getParentRoute: () => workspace,
  path: '/',
  component: lazyRouteComponent(() => import('../pages/Dashboard/DashboardPage'), 'DashboardPage'),
})
const inbox = createRoute({
  getParentRoute: () => workspace,
  path: '/inbox',
  component: lazyRouteComponent(() => import('../pages/Inbox/InboxPage'), 'InboxPage'),
})
const companies = createRoute({
  getParentRoute: () => workspace,
  path: '/companies',
  validateSearch: parseCompanySearch,
  component: lazyRouteComponent(() => import('../pages/Companies/CompaniesPage'), 'CompaniesPage'),
})
const companyDetail = createRoute({
  getParentRoute: () => workspace,
  path: '/companies/$companyId',
  component: lazyRouteComponent(
    () => import('../pages/Companies/CompanyDetailPage'),
    'CompanyDetailPage',
  ),
})
const contacts = createRoute({
  getParentRoute: () => workspace,
  path: '/contacts',
  validateSearch: parseContactSearch,
  component: lazyRouteComponent(() => import('../pages/Contacts/ContactsPage'), 'ContactsPage'),
})
const deals = createRoute({
  getParentRoute: () => workspace,
  path: '/deals',
  validateSearch: parseDealSearch,
  component: lazyRouteComponent(() => import('../pages/Deals/DealsPage'), 'DealsPage'),
})
const dealDetail = createRoute({
  getParentRoute: () => workspace,
  path: '/deals/$dealId',
  validateSearch: parseDealSearch,
  component: lazyRouteComponent(() => import('../pages/Deals/DealProfilePage'), 'DealProfilePage'),
})
const tasks = createRoute({
  getParentRoute: () => workspace,
  path: '/tasks',
  validateSearch: parseTaskSearch,
  component: lazyRouteComponent(() => import('../pages/Tasks/TasksPage'), 'TasksPage'),
})
const services = createRoute({
  getParentRoute: () => workspace,
  path: '/services',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/organizations/$organizationId/services/customer-services',
      params: { organizationId: params.organizationId },
      replace: true,
    })
  },
})
const customerServices = createRoute({
  getParentRoute: () => workspace,
  path: '/services/customer-services',
  component: lazyRouteComponent(
    () => import('../pages/Services/ServicesPage'),
    'CustomerServicesPage',
  ),
})
const billing = createRoute({
  getParentRoute: () => workspace,
  path: '/services/billing',
  component: lazyRouteComponent(() => import('../pages/Services/ServicesPage'), 'BillingPage'),
})
const serviceCatalog = createRoute({
  getParentRoute: () => workspace,
  path: '/services/catalog',
  component: lazyRouteComponent(
    () => import('../pages/Services/ServicesPage'),
    'ServiceCatalogPage',
  ),
})
const collaborators = createRoute({
  getParentRoute: () => workspace,
  path: '/costing/collaborators',
  component: lazyRouteComponent(
    () => import('../pages/Costing/CollaboratorsPage'),
    'CollaboratorsPage',
  ),
})
const members = createRoute({
  getParentRoute: () => workspace,
  path: '/members',
  component: lazyRouteComponent(() => import('../pages/Members/MembersPage'), 'MembersPage'),
})
const settings = createRoute({
  getParentRoute: () => workspace,
  path: '/settings',
  component: lazyRouteComponent(() => import('../pages/Settings/SettingsPage'), 'SettingsPage'),
})
export const router = createRouter({
  routeTree: root.addChildren([
    home,
    login,
    invite,
    installationAdminInvite,
    passwordReset,
    passwordResetConfirm,
    accountSettings,
    workspace.addChildren([
      overview,
      inbox,
      companies,
      companyDetail,
      contacts,
      deals,
      dealDetail,
      tasks,
      services,
      customerServices,
      billing,
      serviceCatalog,
      collaborators,
      members,
      settings,
    ]),
  ]),
})
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
