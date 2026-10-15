import { useMemo, useState, type ComponentProps, type ElementType, type ReactNode } from 'react'
import arrowRight from '@iconify-icons/keyline-icons/arrow-right'
import bell from '@iconify-icons/keyline-icons/bell'
import briefcase from '@iconify-icons/keyline-icons/briefcase'
import building from '@iconify-icons/keyline-icons/building'
import calendar from '@iconify-icons/keyline-icons/calendar'
import checkCircle from '@iconify-icons/keyline-icons/circle-check'
import clock from '@iconify-icons/keyline-icons/clock'
import creditCard from '@iconify-icons/keyline-icons/credit-card'
import listCheck from '@iconify-icons/keyline-icons/list-check'
import plus from '@iconify-icons/keyline-icons/plus'
import users from '@iconify-icons/keyline-icons/users'
import { Icon, type IconifyIcon } from '@iconify/react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Failure } from '../../components/common/Feedback'
import { useCrmSummary } from '../../features/companies/hooks/useCompanies'
import { useInvitations } from '../../features/invitations/hooks/useInvitations'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useSubscriptionOverview } from '../../features/subscriptions'
import { useCompleteTask, useReopenTask, useTasks } from '../../features/tasks'
import { INVITATION_STATUS } from '../../types/invitation.types'
import type { CrmTask } from '../../types/task.types'

type DashboardRoute =
  | '/organizations/$organizationId/companies'
  | '/organizations/$organizationId/contacts'
  | '/organizations/$organizationId/tasks'
  | '/organizations/$organizationId/services/customer-services'
  | '/organizations/$organizationId/services/billing'
  | '/organizations/$organizationId/members'

const KIcon = ({ icon, size = 20 }: { icon: IconifyIcon; size?: number }) => (
  <Icon aria-hidden icon={icon} width={size} height={size} />
)

function Surface({ children, ...props }: ComponentProps<typeof Box> & { component?: ElementType }) {
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

function TextLink({
  to,
  organizationId,
  children,
}: {
  to: DashboardRoute
  organizationId: string
  children: ReactNode
}) {
  return (
    <Link to={to} params={{ organizationId }} style={{ color: 'inherit', textDecoration: 'none' }}>
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
        <KIcon icon={arrowRight} size={18} />
      </Box>
    </Link>
  )
}

function QuickLink({
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
  search?: { create: true }
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
        <KIcon icon={icon} size={19} />
        {children}
      </Box>
    </Link>
  )
}

function TaskRow({
  task,
  organizationId,
  isOverdue,
  canManage,
  pending,
  onComplete,
}: {
  task: CrmTask
  organizationId: string
  isOverdue: boolean
  canManage: boolean
  pending: boolean
  onComplete: (task: CrmTask) => void
}) {
  const { t, i18n } = useTranslation()
  const due = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(task.due_at),
  )
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: canManage ? '44px minmax(0, 1fr) auto' : '12px minmax(0, 1fr) auto',
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
    </Box>
  )
}

function MoneyList({ values, locale }: { values: Record<string, string>; locale: string }) {
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

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const workspace = useWorkspace()
  const summary = useCrmSummary(workspace.id)
  const billing = useSubscriptionOverview(workspace.id)
  const todayTasks = useTasks(workspace.id, { bucket: 'today', assignedTo: 'me' })
  const overdueTasks = useTasks(workspace.id, { bucket: 'overdue', assignedTo: 'me' })
  const complete = useCompleteTask(workspace.id)
  const reopen = useReopenTask(workspace.id)
  const canManage = canCreateRecords(workspace)
  const canManagePeople =
    workspace.current_user_role === 'owner' || workspace.current_user_role === 'admin'
  const invitations = useInvitations(workspace.id, canManagePeople)
  const [completedTask, setCompletedTask] = useState<CrmTask | null>(null)
  const overdueIds = useMemo(
    () => new Set((overdueTasks.data ?? []).map((task) => task.id)),
    [overdueTasks.data],
  )
  const queue = useMemo(
    () => [
      ...(overdueTasks.data ?? []),
      ...(todayTasks.data ?? []).filter((task) => !overdueIds.has(task.id)),
    ],
    [overdueIds, overdueTasks.data, todayTasks.data],
  )
  const visibleQueue = queue.slice(0, 6)
  const nextTask = queue[0]
  const tasksError = overdueTasks.error || todayTasks.error
  const pendingInvitations = (invitations.data ?? []).filter(
    (item) => item.status === INVITATION_STATUS.PENDING,
  )
  const date = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  function completeTask(task: CrmTask) {
    complete.mutate(task.id, { onSuccess: () => setCompletedTask(task) })
  }
  function undoCompletion() {
    if (!completedTask) return
    reopen.mutate(completedTask.id, { onSuccess: () => setCompletedTask(null) })
  }

  const metrics = [
    {
      label: t('crm.dashboard.companies'),
      value: summary.data?.companies,
      icon: building,
      to: '/organizations/$organizationId/companies' as const,
    },
    {
      label: t('crm.dashboard.contacts'),
      value: summary.data?.contacts,
      icon: users,
      to: '/organizations/$organizationId/contacts' as const,
    },
    {
      label: t('crm.dashboard.services'),
      value: billing.data?.active_subscriptions,
      icon: briefcase,
      to: '/organizations/$organizationId/services/customer-services' as const,
    },
  ]

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'background.default',
        px: { xs: 1.5, sm: 3, lg: 4.5 },
        pb: 5,
      }}
    >
      <Box
        component="header"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'flex-end' },
          justifyContent: 'space-between',
          gap: 3,
          pt: { xs: 3.5, md: 5 },
        }}
      >
        <Box>
          <Typography color="text.secondary" sx={{ textTransform: 'capitalize', fontWeight: 650 }}>
            {date}
          </Typography>
          <Typography
            component="h1"
            sx={{
              mt: 1,
              maxWidth: 760,
              fontFamily: (theme) => theme.typography.h1.fontFamily,
              fontSize: { xs: '2.15rem', sm: '3rem', lg: '3.5rem' },
              fontWeight: 780,
              letterSpacing: '-.035em',
              lineHeight: 1.05,
            }}
          >
            {t('crm.dashboard.greeting')}
            <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
              {t('crm.dashboard.moveOneThing')}
            </Box>
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <QuickLink
            primary
            to="/organizations/$organizationId/tasks"
            organizationId={workspace.id}
            icon={plus}
            search={{ create: true }}
          >
            {t('crm.dashboard.openTasks')}
          </QuickLink>
          <QuickLink
            to="/organizations/$organizationId/companies"
            organizationId={workspace.id}
            icon={building}
            search={{ create: true }}
          >
            {t('crm.companies.add')}
          </QuickLink>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.6fr) minmax(300px, .7fr)' },
          gap: 2,
          mt: { xs: 4, md: 5 },
        }}
      >
        <Box
          component="section"
          aria-labelledby="next-action-heading"
          sx={{
            minHeight: nextTask ? { xs: 330, md: 390 } : { xs: 250, md: 300 },
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            p: { xs: 3, md: 4 },
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
          >
            <Typography id="next-action-heading" component="h2" sx={{ fontWeight: 750 }}>
              {t('crm.dashboard.nextAction')}
            </Typography>
            <KIcon icon={listCheck} size={24} />
          </Stack>
          {todayTasks.isPending || overdueTasks.isPending ? (
            <Stack spacing={2} sx={{ mt: 8 }}>
              <Skeleton variant="text" width="75%" height={58} sx={{ bgcolor: 'action.hover' }} />
              <Skeleton variant="text" width="45%" sx={{ bgcolor: 'action.hover' }} />
            </Stack>
          ) : tasksError ? (
            <Box sx={{ mt: { xs: 5, md: 7 }, maxWidth: 620 }}>
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      void overdueTasks.refetch()
                      void todayTasks.refetch()
                    }}
                  >
                    {t('crm.dashboard.retry')}
                  </Button>
                }
              >
                {t('crm.dashboard.tasksLoadError')}
              </Alert>
            </Box>
          ) : nextTask ? (
            <Box sx={{ mt: { xs: 7, md: 9 }, maxWidth: 720 }}>
              <Typography
                sx={{
                  fontFamily: (theme) => theme.typography.h1.fontFamily,
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  fontWeight: 730,
                  letterSpacing: '-.03em',
                  lineHeight: 1.08,
                }}
              >
                {nextTask.title}
              </Typography>
              <Typography
                sx={{ mt: 1.5, color: (theme) => alpha(theme.palette.primary.contrastText, 0.78) }}
              >
                {nextTask.company_name} ·{' '}
                {overdueIds.has(nextTask.id)
                  ? t('crm.dashboard.overdueLabel')
                  : t('crm.dashboard.todayLabel')}
              </Typography>
              {canManage ? (
                <Button
                  variant="contained"
                  color="inherit"
                  disabled={complete.isPending}
                  onClick={() => completeTask(nextTask)}
                  startIcon={
                    complete.isPending ? (
                      <CircularProgress size={18} />
                    ) : (
                      <KIcon icon={checkCircle} />
                    )
                  }
                  sx={{ mt: 3, color: 'primary.main', bgcolor: 'primary.contrastText' }}
                >
                  {t('crm.dashboard.markDone')}
                </Button>
              ) : null}
            </Box>
          ) : (
            <Box sx={{ mt: { xs: 7, md: 9 }, maxWidth: 620 }}>
              <KIcon icon={checkCircle} size={42} />
              <Typography variant="h3" sx={{ mt: 2, color: 'inherit' }}>
                {t('crm.dashboard.nothingDue')}
              </Typography>
              <Typography
                sx={{ mt: 1, color: (theme) => alpha(theme.palette.primary.contrastText, 0.78) }}
              >
                {t('crm.dashboard.nothingDueDescription')}
              </Typography>
            </Box>
          )}
        </Box>

        <Surface
          component="section"
          aria-labelledby="attention-heading"
          sx={{ p: { xs: 2.5, md: 3 } }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
          >
            <Typography id="attention-heading" component="h2" variant="h4">
              {t('crm.dashboard.attention')}
            </Typography>
            <KIcon icon={bell} size={22} />
          </Stack>
          {billing.isPending ? (
            <Stack spacing={1.5} sx={{ mt: 3 }}>
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} variant="rounded" height={58} />
              ))}
            </Stack>
          ) : billing.error ? (
            <Box sx={{ mt: 2 }}>
              <Failure error={billing.error} retry={() => void billing.refetch()} />
            </Box>
          ) : (
            <Stack sx={{ mt: 2 }}>
              {[
                [t('crm.dashboard.overdueCharges'), billing.data?.overdue_charges ?? 0, creditCard],
                [t('crm.dashboard.renewals'), billing.data?.renewals_next_30_days ?? 0, calendar],
                [
                  t('crm.dashboard.scheduledCancellations'),
                  billing.data?.scheduled_cancellations ?? 0,
                  clock,
                ],
              ].map(([label, value, icon]) => (
                <Stack
                  key={String(label)}
                  direction="row"
                  sx={{
                    minHeight: 64,
                    alignItems: 'center',
                    gap: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      width: 36,
                      height: 36,
                      placeItems: 'center',
                      borderRadius: 1.25,
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                    }}
                  >
                    <KIcon icon={icon as IconifyIcon} size={19} />
                  </Box>
                  <Typography sx={{ flex: 1 }} color="text.secondary">
                    {label as ReactNode}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {value as ReactNode}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
          <Box sx={{ mt: 1 }}>
            <TextLink
              to="/organizations/$organizationId/services/billing"
              organizationId={workspace.id}
            >
              {t('crm.dashboard.billingLink')}
            </TextLink>
          </Box>
        </Surface>
      </Box>

      <Surface component="section" aria-labelledby="day-heading" sx={{ mt: 2, overflow: 'hidden' }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Box>
            <Typography id="day-heading" component="h2" variant="h4">
              {t('crm.dashboard.myDay')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {t('crm.dashboard.daySummary', {
                overdue: overdueTasks.data?.length ?? 0,
                today: todayTasks.data?.length ?? 0,
              })}
            </Typography>
          </Box>
          <TextLink to="/organizations/$organizationId/tasks" organizationId={workspace.id}>
            {t('crm.dashboard.allTasks')}
          </TextLink>
        </Stack>
        {tasksError ? (
          <Box sx={{ p: 2 }}>
            <Failure
              error={tasksError}
              retry={() => {
                void overdueTasks.refetch()
                void todayTasks.refetch()
              }}
            />
          </Box>
        ) : null}
        {todayTasks.isPending || overdueTasks.isPending ? (
          <Stack spacing={0.5} sx={{ p: 2 }}>
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} variant="rounded" height={70} />
            ))}
          </Stack>
        ) : tasksError ? null : visibleQueue.length ? (
          visibleQueue.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              organizationId={workspace.id}
              isOverdue={overdueIds.has(task.id)}
              canManage={canManage}
              pending={complete.isPending && complete.variables === task.id}
              onComplete={completeTask}
            />
          ))
        ) : (
          <Stack
            direction="row"
            sx={{
              minHeight: 112,
              alignItems: 'center',
              gap: 2,
              px: 2.5,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <KIcon icon={checkCircle} size={30} />
            <Box>
              <Typography sx={{ fontWeight: 750 }}>{t('crm.dashboard.nothingDue')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('crm.dashboard.nothingDueDescription')}
              </Typography>
            </Box>
          </Stack>
        )}
        {queue.length > visibleQueue.length ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider' }}
          >
            {t('crm.dashboard.moreTasks', { count: queue.length - visibleQueue.length })}
          </Typography>
        ) : null}
      </Surface>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.15fr .85fr' },
          gap: 2,
          mt: 2,
        }}
      >
        <Surface
          component="section"
          aria-labelledby="billing-heading"
          sx={{ p: { xs: 2.5, md: 3 } }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
          >
            <Box>
              <Typography id="billing-heading" component="h2" variant="h4">
                {t('crm.dashboard.businessPulse')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t('crm.dashboard.businessPulseDescription')}
              </Typography>
            </Box>
            <KIcon icon={creditCard} size={22} />
          </Stack>
          {billing.data ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                mt: 2.5,
              }}
            >
              {[
                [t('crm.billingChart.overdue'), billing.data.overdue_balances],
                [t('crm.billingChart.open'), billing.data.open_balances],
                [t('crm.billingChart.collected'), billing.data.collected_this_month],
              ].map(([label, values], index) => (
                <Box
                  key={String(label)}
                  sx={{
                    minHeight: 96,
                    px: { xs: 1, sm: 2 },
                    py: 1.5,
                    borderLeft: index ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {label as ReactNode}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <MoneyList values={values as Record<string, string>} locale={i18n.language} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : billing.isPending ? (
            <Skeleton variant="rounded" height={110} sx={{ mt: 2.5 }} />
          ) : billing.error ? (
            <Box sx={{ mt: 2.5 }}>
              <Failure error={billing.error} retry={() => void billing.refetch()} />
            </Box>
          ) : null}
        </Surface>

        <Surface
          component="section"
          aria-labelledby="workspace-heading"
          sx={{ p: { xs: 2.5, md: 3 } }}
        >
          <Typography id="workspace-heading" component="h2" variant="h4">
            {t('crm.dashboard.workspaceOverview')}
          </Typography>
          {summary.isPending ? (
            <Skeleton variant="rounded" height={112} sx={{ mt: 2 }} />
          ) : summary.error ? (
            <Box sx={{ mt: 2 }}>
              <Failure error={summary.error} retry={() => void summary.refetch()} />
            </Box>
          ) : summary.data?.companies === 0 ? (
            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ fontWeight: 750 }}>{t('crm.dashboard.startWorkspace')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('crm.dashboard.startWorkspaceDescription')}
              </Typography>
              <Box sx={{ mt: 1.5 }}>
                <TextLink
                  to="/organizations/$organizationId/companies"
                  organizationId={workspace.id}
                >
                  {t('crm.companies.add')}
                </TextLink>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', mt: 2 }}>
              {metrics.map((metric, index) => (
                <Link
                  key={metric.label}
                  to={metric.to}
                  params={{ organizationId: workspace.id }}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <Box
                    sx={{
                      minHeight: 112,
                      px: 1.5,
                      py: 1.5,
                      borderLeft: index ? 1 : 0,
                      borderColor: 'divider',
                    }}
                  >
                    <KIcon icon={metric.icon} size={20} />
                    <Typography
                      sx={{
                        mt: 1,
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {metric.value ?? '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {metric.label}
                    </Typography>
                  </Box>
                </Link>
              ))}
            </Box>
          )}
        </Surface>
      </Box>

      {canManagePeople && pendingInvitations.length ? (
        <Surface
          component="section"
          aria-labelledby="invitations-heading"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            mt: 2,
            p: 2.5,
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <KIcon icon={users} size={22} />
            <Box>
              <Typography id="invitations-heading" component="h2" sx={{ fontWeight: 750 }}>
                {t('crm.dashboard.invitations')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('crm.dashboard.pendingInvitationCount', { count: pendingInvitations.length })}
              </Typography>
            </Box>
          </Stack>
          <TextLink to="/organizations/$organizationId/members" organizationId={workspace.id}>
            {t('crm.dashboard.manageInvitations')}
          </TextLink>
        </Surface>
      ) : null}
      {complete.isError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('crm.dashboard.completeError')}
        </Alert>
      ) : null}
      <Snackbar
        open={Boolean(completedTask)}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setCompletedTask(null)
        }}
        message={t('crm.dashboard.taskCompleted', { title: completedTask?.title ?? '' })}
        action={
          <Button color="inherit" size="small" disabled={reopen.isPending} onClick={undoCompletion}>
            {t('crm.dashboard.undo')}
          </Button>
        }
      />
      {reopen.isError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('crm.dashboard.undoError')}
        </Alert>
      ) : null}
    </Box>
  )
}
