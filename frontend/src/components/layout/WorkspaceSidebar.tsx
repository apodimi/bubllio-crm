import { Link } from '@tanstack/react-router'
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
import CheckRounded from '@mui/icons-material/CheckRounded'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import { useTranslation } from 'react-i18next'

import { BrandLogo } from '../common/BrandLogo'
import {
  workspaceNavigation,
  workspacePath,
  type WorkspaceNavigationItem,
} from './workspaceNavigation'

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

type NavigationItem = Omit<WorkspaceNavigationItem, 'children'> & {
  text: string
  path: string
  children?: Array<
    NonNullable<WorkspaceNavigationItem['children']>[number] & {
      text: string
      path: string
    }
  >
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
  const canManageWorkspace = isSuperuser || currentRole === 'owner' || currentRole === 'admin'
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
  const visibleNavigation = workspaceNavigation.filter(
    (item) => !item.requiresWorkspaceManager || canManageWorkspace,
  )
  const navigationGroupLabels = {
    home: t('navigation.groups.home'),
    customers: t('navigation.groups.customers'),
    sales: t('navigation.groups.sales'),
    revenue: t('navigation.groups.revenue'),
    administration: t('navigation.groups.administration'),
  }
  const navigationGroups: NavigationGroup[] = (
    ['home', 'customers', 'sales', 'revenue', 'administration'] as const
  )
    .map((group) => ({
      label: navigationGroupLabels[group],
      items: visibleNavigation
        .filter((item) => item.group === group)
        .map((item) => ({
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
    .filter((group) => group.items.length > 0)

  const navigationLink = (item: NavigationItem) => {
    const selected = item.children
      ? currentPath.startsWith(item.path)
      : currentPath === item.path || currentPath === `${item.path}/`
    const link = (
      <Link
        to={item.route}
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

  const navigationChildren = (item: NavigationItem) =>
    item.children?.map((child) => {
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
              minHeight: 46,
              alignItems: 'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              px: expanded ? 1.25 : 0,
              borderRadius: 1,
              color: selected ? 'primary.main' : 'text.secondary',
              fontSize: 13,
              fontWeight: selected ? 700 : 550,
              '@media (pointer: coarse)': { minHeight: 44 },
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover': { color: 'text.primary' },
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

      return expanded ? (
        link
      ) : (
        <Tooltip key={child.path} title={child.text} placement="right" arrow>
          {link}
        </Tooltip>
      )
    })

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
                {expanded ? (
                  <Typography
                    variant="overline"
                    sx={{
                      display: 'block',
                      px: 1.25,
                      pt: groupIndex ? 1.5 : 0,
                      pb: 0.25,
                      color: 'text.secondary',
                      fontSize: 10,
                      letterSpacing: '.1em',
                      lineHeight: 1.5,
                    }}
                  >
                    {group.label}
                  </Typography>
                ) : null}
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
                      {showNestedNavigation && item.children
                        ? navigationChildren(item)
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
          startIcon={<AppsRounded />}
          sx={{
            minWidth: 0,
            minHeight: 46,
            justifyContent: expanded ? 'flex-start' : 'center',
            px: expanded ? 1.25 : 0,
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
            },
            '& .MuiButton-startIcon': {
              minWidth: expanded ? 34 : 0,
              justifyContent: 'center',
              m: 0,
              '& svg': { fontSize: 19 },
            },
            '@media (pointer: coarse)': { minHeight: 44 },
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
