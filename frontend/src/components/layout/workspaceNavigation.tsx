import briefcaseIcon from '@iconify-icons/keyline-icons/briefcase'
import buildingIcon from '@iconify-icons/keyline-icons/building'
import creditCardIcon from '@iconify-icons/keyline-icons/credit-card'
import homeIcon from '@iconify-icons/keyline-icons/home'
import inboxIcon from '@iconify-icons/keyline-icons/inbox'
import listCheckIcon from '@iconify-icons/keyline-icons/list-check'
import packageIcon from '@iconify-icons/keyline-icons/package'
import settingsIcon from '@iconify-icons/keyline-icons/settings'
import trendingUpIcon from '@iconify-icons/keyline-icons/trending-up'
import userPlusIcon from '@iconify-icons/keyline-icons/user-plus'
import usersIcon from '@iconify-icons/keyline-icons/users'
import userIcon from '@iconify-icons/keyline-icons/user'
import type { ReactNode } from 'react'

import { AppIcon } from '../common/AppIcon'

export type WorkspaceRoute =
  | '/organizations/$organizationId'
  | '/organizations/$organizationId/inbox'
  | '/organizations/$organizationId/companies'
  | '/organizations/$organizationId/contacts'
  | '/organizations/$organizationId/deals'
  | '/organizations/$organizationId/tasks'
  | '/organizations/$organizationId/services/customer-services'
  | '/organizations/$organizationId/services/billing'
  | '/organizations/$organizationId/services/catalog'
  | '/organizations/$organizationId/costing/collaborators'
  | '/organizations/$organizationId/members'
  | '/organizations/$organizationId/settings'

export type WorkspaceNavigationKey =
  | 'overview'
  | 'inbox'
  | 'companies'
  | 'contacts'
  | 'deals'
  | 'tasks'
  | 'services'
  | 'members'
  | 'settings'

type NavigationLabelKey =
  | 'navigation.overview'
  | 'navigation.inbox'
  | 'navigation.companies'
  | 'navigation.contacts'
  | 'navigation.deals'
  | 'navigation.tasks'
  | 'navigation.services'
  | 'navigation.customerServices'
  | 'navigation.billing'
  | 'navigation.catalog'
  | 'navigation.collaborators'
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
    icon: <AppIcon icon={homeIcon} />,
    group: 'home',
    mobile: true,
  },
  {
    key: 'inbox',
    labelKey: 'navigation.inbox',
    route: '/organizations/$organizationId/inbox',
    relativePath: '/inbox',
    icon: <AppIcon icon={inboxIcon} />,
    group: 'home',
    mobile: false,
  },
  {
    key: 'companies',
    labelKey: 'navigation.companies',
    route: '/organizations/$organizationId/companies',
    relativePath: '/companies',
    icon: <AppIcon icon={buildingIcon} />,
    group: 'customers',
    mobile: true,
    mobileLabelKey: 'navigation.customers',
  },
  {
    key: 'contacts',
    labelKey: 'navigation.contacts',
    route: '/organizations/$organizationId/contacts',
    relativePath: '/contacts',
    icon: <AppIcon icon={usersIcon} />,
    group: 'customers',
    mobile: false,
  },
  {
    key: 'deals',
    labelKey: 'navigation.deals',
    route: '/organizations/$organizationId/deals',
    relativePath: '/deals',
    icon: <AppIcon icon={trendingUpIcon} />,
    group: 'sales',
    mobile: true,
  },
  {
    key: 'tasks',
    labelKey: 'navigation.tasks',
    route: '/organizations/$organizationId/tasks',
    relativePath: '/tasks',
    icon: <AppIcon icon={listCheckIcon} />,
    group: 'sales',
    mobile: true,
  },
  {
    key: 'services',
    labelKey: 'navigation.revenue',
    route: '/organizations/$organizationId/services/customer-services',
    relativePath: '/services',
    icon: <AppIcon icon={briefcaseIcon} />,
    group: 'revenue',
    mobile: true,
    mobileLabelKey: 'navigation.revenue',
    children: [
      {
        labelKey: 'navigation.customerServices',
        route: '/organizations/$organizationId/services/customer-services',
        relativePath: '/services/customer-services',
        icon: <AppIcon icon={briefcaseIcon} />,
      },
      {
        labelKey: 'navigation.billing',
        route: '/organizations/$organizationId/services/billing',
        relativePath: '/services/billing',
        icon: <AppIcon icon={creditCardIcon} />,
      },
      {
        labelKey: 'navigation.catalog',
        route: '/organizations/$organizationId/services/catalog',
        relativePath: '/services/catalog',
        icon: <AppIcon icon={packageIcon} />,
      },
      {
        labelKey: 'navigation.collaborators',
        route: '/organizations/$organizationId/costing/collaborators',
        relativePath: '/costing/collaborators',
        icon: <AppIcon icon={userIcon} />,
      },
    ],
  },
  {
    key: 'members',
    labelKey: 'navigation.people',
    route: '/organizations/$organizationId/members',
    relativePath: '/members',
    icon: <AppIcon icon={userPlusIcon} />,
    group: 'administration',
    mobile: false,
    requiresWorkspaceManager: true,
  },
  {
    key: 'settings',
    labelKey: 'navigation.settings',
    route: '/organizations/$organizationId/settings',
    relativePath: '/settings',
    icon: <AppIcon icon={settingsIcon} />,
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
  if (pathname.startsWith(`/organizations/${organizationId}/costing`)) {
    return 'services'
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
