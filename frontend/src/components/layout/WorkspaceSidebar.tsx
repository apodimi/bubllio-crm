import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AppsRounded from '@mui/icons-material/AppsRounded'
import BusinessRounded from '@mui/icons-material/BusinessRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import HomeRounded from '@mui/icons-material/HomeRounded'
import GroupAddRounded from '@mui/icons-material/GroupAddRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import SubscriptionsRounded from '@mui/icons-material/SubscriptionsRounded'
import TaskAltRounded from '@mui/icons-material/TaskAltRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import { useTranslation } from 'react-i18next'

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
  expanded: boolean
  onToggle?: () => void
  showNestedNavigation?: boolean
  showWorkspaceSelector?: boolean
}

type NavigationItem = {
  text: string
  to:
    | '/organizations/$organizationId'
    | '/organizations/$organizationId/companies'
    | '/organizations/$organizationId/contacts'
    | '/organizations/$organizationId/deals'
    | '/organizations/$organizationId/tasks'
    | '/organizations/$organizationId/services'
    | '/organizations/$organizationId/services/customer-services'
    | '/organizations/$organizationId/services/billing'
    | '/organizations/$organizationId/services/catalog'
    | '/organizations/$organizationId/members'
    | '/organizations/$organizationId/settings'
  path: string
  icon: ReactNode
  children?: Array<{
    text: string
    to:
      | '/organizations/$organizationId/services/customer-services'
      | '/organizations/$organizationId/services/billing'
      | '/organizations/$organizationId/services/catalog'
    path: string
  }>
}

type NavigationGroup = {
  label: string
  items: NavigationItem[]
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
  expanded,
  onToggle,
  showNestedNavigation = false,
  showWorkspaceSelector = true,
}: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [servicesExpanded, setServicesExpanded] = useState(false)
  const canManageWorkspace = isSuperuser || currentRole === 'owner' || currentRole === 'admin'
  const basePath = organizationId ? `/organizations/${organizationId}` : ''
  const selectedOrganization = organizations.find(
    (organization) => organization.id === organizationId,
  )
  const organizationInitials = (name: string) =>
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  const navigationGroups: NavigationGroup[] = [
    {
      label: t('navigation.groups.home'),
      items: [
        {
          text: t('navigation.overview'),
          to: '/organizations/$organizationId',
          path: basePath,
          icon: <HomeRounded />,
        },
      ],
    },
    {
      label: t('navigation.groups.relationships'),
      items: [
        {
          text: t('navigation.companies'),
          to: '/organizations/$organizationId/companies',
          path: `${basePath}/companies`,
          icon: <BusinessRounded />,
        },
        {
          text: t('navigation.contacts'),
          to: '/organizations/$organizationId/contacts',
          path: `${basePath}/contacts`,
          icon: <PeopleAltRounded />,
        },
      ],
    },
    {
      label: t('navigation.groups.work'),
      items: [
        {
          text: t('navigation.deals'),
          to: '/organizations/$organizationId/deals',
          path: `${basePath}/deals`,
          icon: <TrendingUpRounded />,
        },
        {
          text: t('navigation.tasks'),
          to: '/organizations/$organizationId/tasks',
          path: `${basePath}/tasks`,
          icon: <TaskAltRounded />,
        },
      ],
    },
    {
      label: t('navigation.groups.operations'),
      items: [
        {
          text: t('navigation.services'),
          to: '/organizations/$organizationId/services/customer-services',
          path: `${basePath}/services`,
          icon: <SubscriptionsRounded />,
          children: [
            {
              text: t('navigation.customerServices'),
              to: '/organizations/$organizationId/services/customer-services',
              path: `${basePath}/services/customer-services`,
            },
            {
              text: t('navigation.billing'),
              to: '/organizations/$organizationId/services/billing',
              path: `${basePath}/services/billing`,
            },
            {
              text: t('navigation.catalog'),
              to: '/organizations/$organizationId/services/catalog',
              path: `${basePath}/services/catalog`,
            },
          ],
        },
      ],
    },
  ]

  if (canManageWorkspace) {
    navigationGroups.push({
      label: t('navigation.groups.workspace'),
      items: [
        {
          text: t('navigation.people'),
          to: '/organizations/$organizationId/members',
          path: `${basePath}/members`,
          icon: <GroupAddRounded />,
        },
        {
          text: t('navigation.settings'),
          to: '/organizations/$organizationId/settings',
          path: `${basePath}/settings`,
          icon: <SettingsRounded />,
        },
      ],
    })
  }

  const navigationLink = (item: NavigationItem) => {
    const selected = item.children
      ? currentPath.startsWith(item.path)
      : currentPath === item.path || currentPath === `${item.path}/`
    const link = (
      <Link
        to={item.to}
        params={{ organizationId: organizationId ?? '' }}
        aria-label={item.text}
        aria-current={selected ? 'page' : undefined}
        style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
        onClick={onClose}
      >
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            minHeight: 46,
            justifyContent: expanded ? 'flex-start' : 'center',
            px: expanded ? 1.25 : 0,
            py: 0.5,
            borderRadius: 1,
            color: 'text.secondary',
            transition: 'background-color 160ms ease, color 160ms ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '@media (pointer: coarse)': { minHeight: 44 },
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': {
                bgcolor: 'transparent',
                color: 'text.primary',
              },
            },
            ...(selected ? { bgcolor: 'transparent', color: 'primary.main' } : {}),
            'a:focus-visible &': {
              outline: '3px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: expanded ? 34 : 0,
              justifyContent: 'center',
              color: 'inherit',
              '& svg': { fontSize: 19 },
            }}
          >
            {item.icon}
          </ListItemIcon>
          {expanded ? (
            <>
              <ListItemText
                primary={item.text}
                slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 550 } } }}
              />
            </>
          ) : null}
        </Box>
      </Link>
    )

    if (expanded) {
      return link
    }

    return (
      <Tooltip title={item.text} placement="right" arrow>
        {link}
      </Tooltip>
    )
  }

  const navigationTree = (item: NavigationItem) => {
    const selected = currentPath.startsWith(item.path)
    const selectedChild = item.children?.find(
      (child) => currentPath === child.path || currentPath === `${child.path}/`,
    )
    const selectedItemId = selectedChild?.path ?? (selected ? item.path : null)

    const navigateToItem = (itemId: string) => {
      const child = item.children?.find((candidate) => candidate.path === itemId)

      if (child) {
        void navigate({
          to: child.to,
          params: { organizationId: organizationId ?? '' },
        })
        onClose()
        return
      }

      // Parent rows organize real child routes. Selection expands the MUI tree;
      // navigation happens only after the user chooses a concrete destination.
    }

    return (
      <SimpleTreeView
        aria-label={item.text}
        expandedItems={selected || servicesExpanded ? [item.path] : []}
        onExpandedItemsChange={(_event, itemIds) =>
          setServicesExpanded(itemIds.includes(item.path))
        }
        selectedItems={selectedItemId}
        onSelectedItemsChange={(_event, itemId) => {
          if (itemId) {
            navigateToItem(itemId)
          }
        }}
        sx={{
          color: 'inherit',
          [`& .${treeItemClasses.content}`]: {
            minHeight: 46,
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            color: 'text.secondary',
            transition: 'background-color 160ms ease, color 160ms ease',
            '@media (pointer: coarse)': { minHeight: 44 },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': {
                bgcolor: 'transparent',
                color: 'text.primary',
              },
            },
            '&.Mui-selected, &.Mui-selected:hover, &.Mui-focused': {
              bgcolor: 'transparent',
              color: 'primary.main',
            },
          },
          [`& .${treeItemClasses.iconContainer}`]: {
            width: 20,
            mr: 1,
            color: 'inherit',
          },
          [`& .${treeItemClasses.label}`]: {
            fontFamily: 'inherit',
          },
          [`& .${treeItemClasses.groupTransition}`]: {
            ml: 2.25,
            pl: 1.5,
            borderLeft: 1,
            borderColor: 'divider',
          },
          [`& .${treeItemClasses.groupTransition} .${treeItemClasses.content}`]: {
            minHeight: 36,
            py: 0.25,
            pl: 1.25,
            fontSize: 13,
          },
          [`&& .${treeItemClasses.groupTransition} .${treeItemClasses.content}.Mui-selected`]: {
            bgcolor: 'transparent',
            color: 'primary.main',
          },
          [`&& .${treeItemClasses.groupTransition} .${treeItemClasses.content}.Mui-selected:hover`]:
            {
              bgcolor: 'transparent',
            },
        }}
      >
        <TreeItem
          itemId={item.path}
          label={
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ display: 'grid', placeItems: 'center', '& svg': { fontSize: 19 } }}>
                {item.icon}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {item.text}
              </Typography>
            </Stack>
          }
        >
          {item.children?.map((child) => (
            <TreeItem
              key={child.path}
              itemId={child.path}
              label={
                <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 550 }}>
                  {child.text}
                </Typography>
              }
            />
          ))}
        </TreeItem>
      </SimpleTreeView>
    )
  }

  return (
    <Stack
      sx={{
        height: '100%',
        px: expanded ? 3.5 : 1,
        py: expanded ? 3.5 : 1.5,
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Stack
        direction={expanded ? 'row' : 'column'}
        sx={{
          alignItems: 'center',
          justifyContent: expanded ? 'space-between' : 'center',
          minHeight: expanded ? 48 : 72,
          mx: expanded ? 0 : 0,
          mt: 0,
          mb: expanded ? 4.5 : 2,
          gap: expanded ? 0 : 0.5,
        }}
      >
        <Box
          component={Link}
          to="/"
          aria-label="Bubllio home"
          sx={{
            width: expanded ? 'auto' : 36,
            height: 36,
            flexShrink: 0,
            textDecoration: 'none',
            '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
          }}
        >
          <BrandLogo compact={!expanded} />
        </Box>
        {onToggle ? (
          <Tooltip
            title={expanded ? t('navigation.collapseNavigation') : t('navigation.expandNavigation')}
            placement="right"
          >
            <IconButton
              aria-label={
                expanded ? t('navigation.collapseNavigation') : t('navigation.expandNavigation')
              }
              onClick={onToggle}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: 'action.hover',
                },
              }}
            >
              {expanded ? <ChevronLeftRounded /> : <ChevronRightRounded />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      {expanded && showWorkspaceSelector ? (
        <Typography
          variant="overline"
          sx={{
            px: 1,
            mb: 1,
            color: 'text.secondary',
            letterSpacing: '.13em',
            fontSize: 10,
          }}
        >
          {t('common.workspace').toUpperCase()}
        </Typography>
      ) : null}
      {showWorkspaceSelector ? (
        <Select
          size="small"
          displayEmpty
          value={
            organizations.some((organization) => organization.id === organizationId)
              ? organizationId
              : ''
          }
          inputProps={{ 'aria-label': t('common.selectWorkspace') }}
          onChange={(event) => onOrganizationChange(event.target.value)}
          IconComponent={KeyboardArrowDownRounded}
          renderValue={() =>
            selectedOrganization ? (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {organizationInitials(selectedOrganization.name)}
                </Avatar>
                <Typography variant="body2" noWrap sx={{ minWidth: 0, fontWeight: 650 }}>
                  {selectedOrganization.name}
                </Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">{t('common.selectWorkspace')}</Typography>
            )
          }
          MenuProps={{
            slotProps: {
              paper: { sx: { mt: 0.5, borderRadius: 1.5, minWidth: 210, p: 0.5 } },
            },
          }}
          sx={{
            width: expanded ? 'auto' : 44,
            alignSelf: expanded ? 'stretch' : 'center',
            mb: expanded ? 2.5 : 2,
            borderRadius: 1,
            color: 'text.primary',
            bgcolor: 'background.paper',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '& .MuiSelect-icon': {
              display: expanded ? 'block' : 'none',
              color: 'text.secondary',
            },
            '& .MuiSelect-select': {
              display: 'flex',
              justifyContent: expanded ? 'flex-start' : 'center',
              py: 0.75,
              pl: expanded ? 1.5 : 0.75,
              pr: expanded ? 4.5 : '6px !important',
            },
          }}
        >
          <MenuItem value="" disabled>
            {t('common.selectWorkspace')}
          </MenuItem>
          {organizations.map((organization) => (
            <MenuItem
              value={organization.id}
              key={organization.id}
              sx={{ borderRadius: 1.25, mb: 0.15, py: 0.75 }}
            >
              <Avatar
                sx={{
                  width: 26,
                  height: 26,
                  mr: 1.25,
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {organizationInitials(organization.name)}
              </Avatar>
              <ListItemText
                primary={organization.name}
                slotProps={{ primary: { noWrap: true, sx: { fontWeight: 650 } } }}
              />
              {organization.id === organizationId ? (
                <CheckRounded color="primary" fontSize="small" />
              ) : null}
            </MenuItem>
          ))}
        </Select>
      ) : null}
      <Box
        component="nav"
        aria-label={t('navigation.primaryNavigation')}
        sx={{ overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
      >
        {organizationId
          ? navigationGroups.map((group, groupIndex) => (
              <Box key={group.label} sx={{ mb: expanded ? 0.25 : 0.75 }}>
                {!expanded && groupIndex ? (
                  <Divider
                    sx={{
                      mx: 1,
                      my: 0.75,
                      borderColor: 'divider',
                    }}
                  />
                ) : null}
                <List disablePadding sx={{ display: 'grid', gap: 0.25 }}>
                  {group.items.map((item) => (
                    <Box key={item.text}>
                      {expanded && showNestedNavigation && item.children
                        ? navigationTree(item)
                        : navigationLink(item)}
                    </Box>
                  ))}
                </List>
              </Box>
            ))
          : null}
      </Box>
      <Tooltip title={expanded ? '' : t('common.allWorkspaces')} placement="right" arrow>
        <Button
          component={Link}
          to="/"
          onClick={onClose}
          aria-label={t('common.allWorkspaces')}
          startIcon={expanded ? undefined : <AppsRounded />}
          sx={{
            minWidth: 0,
            justifyContent: expanded ? 'flex-start' : 'center',
            px: expanded ? 2 : 0,
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
            },
            '& .MuiButton-startIcon': { m: 0 },
          }}
        >
          {expanded ? t('common.allWorkspaces') : null}
        </Button>
      </Tooltip>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ my: 2, borderColor: 'divider' }} />
      {expanded ? (
        <>
          <Typography variant="caption" noWrap sx={{ px: 1, color: 'text.secondary' }}>
            {t('common.signedInAs', { username: username ?? '' })}
          </Typography>
          <Typography
            variant="caption"
            aria-label="Bubllio CRM version"
            sx={{
              px: 1,
              mt: 0.5,
              color: 'text.secondary',
            }}
          >
            Bubllio CRM v{__APP_VERSION__}
          </Typography>
        </>
      ) : (
        <Typography
          variant="caption"
          aria-label="Bubllio CRM version"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          v{__APP_VERSION__}
        </Typography>
      )}
    </Stack>
  )
}
