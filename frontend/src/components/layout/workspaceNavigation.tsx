import BusinessRounded from '@mui/icons-material/BusinessRounded'
import GroupAddRounded from '@mui/icons-material/GroupAddRounded'
import HomeRounded from '@mui/icons-material/HomeRounded'
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded'
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import SubscriptionsRounded from '@mui/icons-material/SubscriptionsRounded'
import TaskAltRounded from '@mui/icons-material/TaskAltRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import type { ReactNode } from 'react'

export type WorkspaceRoute =
  | '/organizations/$organizationId'
  | '/organizations/$organizationId/companies'
  | '/organizations/$organizationId/contacts'
  | '/organizations/$organizationId/deals'
  | '/organizations/$organizationId/tasks'
  | '/organizations/$organizationId/services/customer-services'
  | '/organizations/$organizationId/services/billing'
  | '/organizations/$organizationId/services/catalog'
  | '/organizations/$organizationId/members'
  | '/organizations/$organizationId/settings'

export type WorkspaceNavigationKey =
  'overview' | 'companies' | 'contacts' | 'deals' | 'tasks' | 'services' | 'members' | 'settings'

type NavigationLabelKey =
  | 'navigation.overview'
  | 'navigation.companies'
  | 'navigation.contacts'
  | 'navigation.deals'
  | 'navigation.tasks'
  | 'navigation.services'
  | 'navigation.customerServices'
  | 'navigation.billing'
  | 'navigation.catalog'
  | 'navigation.people'
  | 'navigation.settings'
  | 'navigation.customers'
  | 'navigation.revenue'

export type WorkspaceNavigationItem = {
  key: WorkspaceNavigationKey
  labelKey: NavigationLabelKey
  route: WorkspaceRoute
  relativePath: string
  icon: ReactNode
  group: 'home' | 'customers' | 'sales' | 'revenue' | 'administration'
  mobile: boolean
  mobileLabelKey?: NavigationLabelKey
  requiresWorkspaceManager?: boolean
  children?: Array<{
    labelKey: NavigationLabelKey
    route: WorkspaceRoute
    relativePath: string
    icon: ReactNode
  }>
}

export const workspaceNavigation: WorkspaceNavigationItem[] = [
  {
    key: 'overview',
    labelKey: 'navigation.overview',
    route: '/organizations/$organizationId',
    relativePath: '',
    icon: <HomeRounded />,
    group: 'home',
    mobile: true,
  },
  {
    key: 'companies',
    labelKey: 'navigation.companies',
    route: '/organizations/$organizationId/companies',
    relativePath: '/companies',
    icon: <BusinessRounded />,
    group: 'customers',
    mobile: true,
    mobileLabelKey: 'navigation.customers',
  },
  {
    key: 'contacts',
    labelKey: 'navigation.contacts',
    route: '/organizations/$organizationId/contacts',
    relativePath: '/contacts',
    icon: <PeopleAltRounded />,
    group: 'customers',
    mobile: false,
  },
  {
    key: 'deals',
    labelKey: 'navigation.deals',
    route: '/organizations/$organizationId/deals',
    relativePath: '/deals',
    icon: <TrendingUpRounded />,
    group: 'sales',
    mobile: true,
  },
  {
    key: 'tasks',
    labelKey: 'navigation.tasks',
    route: '/organizations/$organizationId/tasks',
    relativePath: '/tasks',
    icon: <TaskAltRounded />,
    group: 'sales',
    mobile: true,
  },
  {
    key: 'services',
    labelKey: 'navigation.revenue',
    route: '/organizations/$organizationId/services/customer-services',
    relativePath: '/services',
    icon: <SubscriptionsRounded />,
    group: 'revenue',
    mobile: true,
    mobileLabelKey: 'navigation.revenue',
    children: [
      {
        labelKey: 'navigation.customerServices',
        route: '/organizations/$organizationId/services/customer-services',
        relativePath: '/services/customer-services',
        icon: <SubscriptionsRounded />,
      },
      {
        labelKey: 'navigation.billing',
        route: '/organizations/$organizationId/services/billing',
        relativePath: '/services/billing',
        icon: <ReceiptLongRounded />,
      },
      {
        labelKey: 'navigation.catalog',
        route: '/organizations/$organizationId/services/catalog',
        relativePath: '/services/catalog',
        icon: <Inventory2Rounded />,
      },
    ],
  },
  {
    key: 'members',
    labelKey: 'navigation.people',
    route: '/organizations/$organizationId/members',
    relativePath: '/members',
    icon: <GroupAddRounded />,
    group: 'administration',
    mobile: false,
    requiresWorkspaceManager: true,
  },
  {
    key: 'settings',
    labelKey: 'navigation.settings',
    route: '/organizations/$organizationId/settings',
    relativePath: '/settings',
    icon: <SettingsRounded />,
    group: 'administration',
    mobile: false,
    requiresWorkspaceManager: true,
  },
]

export function workspacePath(organizationId: string, item: WorkspaceNavigationItem) {
  return `/organizations/${organizationId}${item.relativePath}`
}

export function selectedMobileNavigation(pathname: string, organizationId?: string) {
  if (!organizationId) {
    return false
  }

  if (pathname.startsWith(`/organizations/${organizationId}/contacts`)) {
    return 'companies'
  }

  const item = workspaceNavigation
    .filter((candidate) => candidate.mobile)
    .find((candidate) => {
      const path = workspacePath(organizationId, candidate)
      if (!candidate.relativePath) {
        return pathname === path || pathname === `${path}/`
      }
      return pathname.startsWith(path)
    })

  return item?.key ?? false
}
