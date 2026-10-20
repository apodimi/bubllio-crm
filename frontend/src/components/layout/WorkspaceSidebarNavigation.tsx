import { useState, type ReactElement } from 'react'
import chevronDownIcon from '@iconify-icons/keyline-icons/chevron-down'
import chevronRightIcon from '@iconify-icons/keyline-icons/chevron-right'
import { Link } from '@tanstack/react-router'
import {
  Box,
  Collapse,
  Divider,
  List,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../common/AppIcon'
import type { ActivityInboxItem } from '../../types/activityInbox.types'
import { ActivityInboxIndicator } from './ActivityInboxIndicator'
import {
  workspaceNavigation,
  workspacePath,
  type WorkspaceNavigationItem,
} from './workspaceNavigation'

type NavigationItem = Omit<WorkspaceNavigationItem, 'children'> & {
  text: string
  path: string
  children?: Array<
    NonNullable<WorkspaceNavigationItem['children']>[number] & { text: string; path: string }
  >
}

type Props = {
  organizationId?: string
  currentPath: string
  isSuperuser: boolean
  currentRole?: string | null
  expanded: boolean
  showNestedNavigation: boolean
  onClose: () => void
  inboxCount: number
  inboxItems?: ActivityInboxItem[]
}

type LinkProps = Pick<Props, 'organizationId' | 'currentPath' | 'expanded' | 'onClose'> & {
  item: NavigationItem
  inboxCount: number
  inboxItems?: ActivityInboxItem[]
  inboxLabel: string
}

function WithTooltip({
  expanded,
  title,
  children,
}: {
  expanded: boolean
  title: string
  children: ReactElement
}) {
  return expanded ? (
    children
  ) : (
    <Tooltip title={title} placement="right" arrow>
      {children}
    </Tooltip>
  )
}

function NavigationLink({
  organizationId,
  currentPath,
  expanded,
  onClose,
  item,
  inboxCount,
  inboxItems,
  inboxLabel,
}: LinkProps) {
  const selected = item.children
    ? currentPath.startsWith(item.path) ||
      item.children.some((child) => currentPath.startsWith(child.path))
    : currentPath === item.path || currentPath === `${item.path}/`
  const link = (
    <Link
      to={item.route}
      params={{ organizationId: organizationId ?? '' }}
      aria-label={item.key === 'inbox' ? inboxLabel : item.text}
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
          minHeight: 40,
          justifyContent: expanded ? 'flex-start' : 'center',
          px: expanded ? 1.5 : 0,
          borderRadius: 1.5,
          color: selected ? 'primary.main' : 'text.secondary',
          bgcolor: selected ? 'action.selected' : 'transparent',
          transition: 'background-color 160ms ease, color 160ms ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          '@media (pointer: coarse)': { minHeight: 44 },
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          },
          ...(selected
            ? {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  insetBlock: 9,
                  insetInlineStart: 0,
                  width: 2,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                },
              }
            : {}),
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
          <ActivityInboxIndicator count={item.key === 'inbox' ? inboxCount : 0} items={inboxItems}>
            {item.icon}
          </ActivityInboxIndicator>
        </ListItemIcon>
        {expanded ? (
          <ListItemText
            primary={item.text}
            slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: selected ? 700 : 580 } } }}
          />
        ) : null}
      </Box>
    </Link>
  )

  return (
    <WithTooltip expanded={expanded} title={item.text}>
      {link}
    </WithTooltip>
  )
}

function NavigationChildren({
  organizationId,
  currentPath,
  expanded,
  onClose,
  item,
}: Omit<LinkProps, 'inboxCount' | 'inboxItems' | 'inboxLabel'>) {
  return item.children?.map((child) => {
    const selected = currentPath === child.path || currentPath === `${child.path}/`
    const link = (
      <Link
        key={child.path}
        to={child.route}
        params={{ organizationId: organizationId ?? '' }}
        aria-label={child.text}
        aria-current={selected ? 'page' : undefined}
        onClick={onClose}
        style={{ color: 'inherit', textDecoration: 'none' }}
      >
        <Box
          sx={{
            display: 'flex',
            minHeight: 38,
            alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            position: 'relative',
            ml: expanded ? 1.25 : 0,
            px: expanded ? 1.25 : 0,
            borderRadius: 1.5,
            bgcolor: selected ? 'action.selected' : 'transparent',
            color: selected ? 'primary.main' : 'text.secondary',
            fontSize: 13,
            fontWeight: selected ? 700 : 550,
            ...(selected
              ? {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    insetBlock: 9,
                    insetInlineStart: 0,
                    width: 2,
                    borderRadius: 1,
                    bgcolor: 'primary.main',
                  },
                }
              : {}),
            '@media (pointer: coarse)': { minHeight: 44 },
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            },
            'a:focus-visible &': {
              outline: '3px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              minWidth: expanded ? 34 : 0,
              '& svg': { fontSize: 19 },
            }}
          >
            {child.icon}
          </Box>
          {expanded ? child.text : null}
        </Box>
      </Link>
    )
    return (
      <WithTooltip key={child.path} expanded={expanded} title={child.text}>
        {link}
      </WithTooltip>
    )
  })
}

export function WorkspaceSidebarNavigation({
  organizationId,
  currentPath,
  isSuperuser,
  currentRole,
  expanded,
  showNestedNavigation,
  onClose,
  inboxCount,
  inboxItems,
}: Props) {
  const { t } = useTranslation()
  const [revenueExpanded, setRevenueExpanded] = useState(
    currentPath.includes('/services/') || currentPath.includes('/costing/'),
  )
  const canManage = isSuperuser || currentRole === 'owner' || currentRole === 'admin'
  const labels = {
    home: t('navigation.groups.home'),
    customers: t('navigation.groups.customers'),
    sales: t('navigation.groups.sales'),
    revenue: t('navigation.groups.revenue'),
    administration: t('navigation.groups.administration'),
  }
  const groups = (['home', 'customers', 'sales', 'revenue'] as const)
    .map((group) => ({
      label: labels[group],
      items: workspaceNavigation
        .filter((item) => item.group === group && (!item.requiresWorkspaceManager || canManage))
        .map((item): NavigationItem => ({
          ...item,
          text: t(item.labelKey),
          path: organizationId ? workspacePath(organizationId, item) : '',
          children: item.children?.map((child) => ({
            ...child,
            text: t(child.labelKey),
            path: organizationId ? `/organizations/${organizationId}${child.relativePath}` : '',
          })),
        })),
    }))
    .filter(({ items }) => items.length > 0)
  const linkProps = { organizationId, currentPath, expanded, onClose }

  return (
    <Box
      component="nav"
      aria-label={t('navigation.primaryNavigation')}
      sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, pr: 0.25 }}
    >
      {organizationId
        ? groups.map((group, index) => {
            const revenue = group.label === labels.revenue
            const links = group.items.map((item) => (
              <Box key={item.text}>
                {expanded && showNestedNavigation && item.children ? (
                  <NavigationChildren {...linkProps} item={item} />
                ) : (
                  <NavigationLink
                    {...linkProps}
                    item={item}
                    inboxCount={inboxCount}
                    inboxItems={inboxItems}
                    inboxLabel={t('navigation.inboxWithCount', { count: inboxCount })}
                  />
                )}
              </Box>
            ))

            if (revenue && expanded) {
              return (
                <Box key={group.label} sx={{ mb: 1 }}>
                  <Box
                    component="button"
                    type="button"
                    aria-expanded={revenueExpanded}
                    onClick={() => setRevenueExpanded((open) => !open)}
                    sx={{
                      display: 'flex',
                      width: '100%',
                      minHeight: 36,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.5,
                      border: 0,
                      borderRadius: 1.5,
                      bgcolor: 'transparent',
                      color: 'text.secondary',
                      cursor: 'pointer',
                      font: 'inherit',
                      '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                      '&:focus-visible': {
                        outline: '3px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{ fontSize: 10, fontWeight: 750, letterSpacing: '.08em' }}
                    >
                      {group.label}
                    </Typography>
                    <AppIcon
                      icon={revenueExpanded ? chevronDownIcon : chevronRightIcon}
                      size={18}
                    />
                  </Box>
                  <Collapse in={revenueExpanded} timeout={180} unmountOnExit>
                    <List disablePadding sx={{ display: 'grid', gap: 0.375, mt: 0.375 }}>
                      {links}
                    </List>
                  </Collapse>
                </Box>
              )
            }

            return (
              <Box key={group.label} sx={{ mb: expanded ? 1 : 0.75 }}>
                {expanded ? (
                  <Typography
                    variant="overline"
                    sx={{
                      display: 'block',
                      px: 1.5,
                      pt: index ? 1 : 0,
                      pb: 0.5,
                      color: 'text.secondary',
                      fontSize: 10,
                      fontWeight: 750,
                      letterSpacing: '.08em',
                      lineHeight: 1.4,
                    }}
                  >
                    {group.label}
                  </Typography>
                ) : null}
                {!expanded && index ? (
                  <Divider sx={{ mx: 1, my: 0.75, borderColor: 'divider' }} />
                ) : null}
                <List disablePadding sx={{ display: 'grid', gap: 0.375 }}>
                  {links}
                </List>
              </Box>
            )
          })
        : null}
    </Box>
  )
}
