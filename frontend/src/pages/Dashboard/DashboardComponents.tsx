import {
  useState,
  type ComponentProps,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from 'react'
import arrowRight from '@iconify-icons/keyline-icons/arrow-right'
import moreHorizontal from '@iconify-icons/keyline-icons/more-horizontal'
import type { IconifyIcon } from '@iconify/react'
import {
  Box,
  Checkbox,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import type { CrmTask } from '../../types/task.types'

type DashboardRoute =
  | '/organizations/$organizationId/companies'
  | '/organizations/$organizationId/contacts'
  | '/organizations/$organizationId/tasks'
  | '/organizations/$organizationId/deals'
  | '/organizations/$organizationId/deals/$dealId'
  | '/organizations/$organizationId/services/customer-services'
  | '/organizations/$organizationId/services/billing'
  | '/organizations/$organizationId/members'

export function Surface({
  children,
  ...props
}: ComponentProps<typeof Box> & { component?: ElementType }) {
  return (
    <Box
      {...props}
      sx={{
        borderRadius: 3,
        bgcolor: 'background.paper',
        boxShadow: (theme) => theme.shadows[1],
        ...(props.sx as object),
      }}
    >
      {children}
    </Box>
  )
}

export function TextLink({
  to,
  organizationId,
  children,
  search,
  dealId,
}: {
  to: DashboardRoute
  organizationId: string
  children: ReactNode
  search?: Record<string, string>
  dealId?: string
}) {
  return (
    <Link
      to={to}
      params={{ organizationId, dealId }}
      search={search}
      style={{ color: 'inherit', textDecoration: 'none' }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          minHeight: 44,
          alignItems: 'center',
          gap: 0.75,
          color: 'primary.main',
          fontWeight: 750,
          'a:focus-visible &': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: 3,
            borderRadius: 1,
          },
        }}
      >
        {children}
        <AppIcon icon={arrowRight} size={18} />
      </Box>
    </Link>
  )
}

export function QuickLink({
  to,
  organizationId,
  icon,
  children,
  primary = false,
  search,
}: {
  to: DashboardRoute
  organizationId: string
  icon: IconifyIcon
  children: ReactNode
  primary?: boolean
  search?: Record<string, string | boolean>
}) {
  return (
    <Link to={to} params={{ organizationId }} search={search} style={{ textDecoration: 'none' }}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          minHeight: 44,
          alignItems: 'center',
          gap: 1,
          px: 1.75,
          borderRadius: 1.5,
          bgcolor: primary ? 'primary.main' : 'background.paper',
          color: primary ? 'primary.contrastText' : 'text.primary',
          boxShadow: (theme) => (primary ? 'none' : theme.shadows[1]),
          fontWeight: 750,
          transition: (theme) => theme.transitions.create(['background-color', 'transform']),
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { bgcolor: primary ? 'primary.dark' : 'action.hover' },
          },
          '&:active': { transform: 'scale(.985)' },
          'a:focus-visible &': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: 3,
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <AppIcon icon={icon} size={19} />
        {children}
      </Box>
    </Link>
  )
}

export function TaskRow({
  task,
  organizationId,
  isOverdue,
  canManage,
  pending,
  onComplete,
  onLogCommunication,
  onSnooze,
}: {
  task: CrmTask
  organizationId: string
  isOverdue: boolean
  canManage: boolean
  pending: boolean
  onComplete: (task: CrmTask) => void
  onLogCommunication: (task: CrmTask) => void
  onSnooze: (task: CrmTask) => void
}) {
  const { t, i18n } = useTranslation()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const due = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(task.due_at),
  )
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: canManage
          ? '44px minmax(0, 1fr) auto 44px'
          : '12px minmax(0, 1fr) auto',
        minHeight: 72,
        alignItems: 'center',
        gap: 1.25,
        px: { xs: 1.5, sm: 2.25 },
        borderTop: 1,
        borderColor: 'divider',
        transition: (theme) => theme.transitions.create('background-color'),
        '@media (hover: hover) and (pointer: fine)': { '&:hover': { bgcolor: 'action.hover' } },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {canManage ? (
        <Checkbox
          checked={false}
          disabled={pending}
          onChange={() => onComplete(task)}
          slotProps={{
            input: { 'aria-label': t('crm.dashboard.completeTask', { title: task.title }) },
          }}
          icon={pending ? <CircularProgress size={18} /> : undefined}
          sx={{ width: 44, height: 44, p: 0 }}
        />
      ) : (
        <Box aria-hidden />
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 750 }} noWrap>
          {task.title}
        </Typography>
        <Stack direction="row" sx={{ mt: 0.25, alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Link
            to="/organizations/$organizationId/companies/$companyId"
            params={{ organizationId, companyId: task.company }}
            style={{ color: 'inherit', textUnderlineOffset: '0.2em' }}
          >
            <Typography component="span" variant="caption" color="text.secondary">
              {task.company_name}
            </Typography>
          </Link>
          <Typography
            component="span"
            variant="caption"
            color={isOverdue ? 'error.main' : 'primary.main'}
            sx={{ fontWeight: 750 }}
          >
            {isOverdue ? t('crm.dashboard.overdueLabel') : t('crm.dashboard.todayLabel')}
          </Typography>
        </Stack>
      </Box>
      <Typography
        variant="body2"
        color={isOverdue ? 'error.main' : 'text.secondary'}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {due}
      </Typography>
      {canManage ? (
        <>
          <IconButton
            aria-label={t('crm.dashboard.taskActions', { title: task.title })}
            disabled={pending}
            onClick={(event: MouseEvent<HTMLButtonElement>) => setMenuAnchor(event.currentTarget)}
          >
            <AppIcon icon={moreHorizontal} size={22} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                onLogCommunication(task)
              }}
            >
              {t('crm.dashboard.logCommunication')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                onSnooze(task)
              }}
            >
              {t('crm.dashboard.snoozeTomorrow')}
            </MenuItem>
          </Menu>
        </>
      ) : null}
    </Box>
  )
}

export function MoneyList({ values, locale }: { values: Record<string, string>; locale: string }) {
  const entries = Object.entries(values)
  if (!entries.length) return <Typography color="text.secondary">—</Typography>
  return (
    <Stack spacing={0.25}>
      {entries.map(([currency, value]) => (
        <Typography key={currency} sx={{ fontWeight: 750, fontVariantNumeric: 'tabular-nums' }}>
          {new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
          }).format(Number(value))}
        </Typography>
      ))}
    </Stack>
  )
}
