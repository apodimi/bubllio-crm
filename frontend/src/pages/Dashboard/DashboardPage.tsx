import { useMemo, useState } from 'react'
import bell from '@iconify-icons/keyline-icons/bell'
import building from '@iconify-icons/keyline-icons/building'
import calendar from '@iconify-icons/keyline-icons/calendar'
import checkCircle from '@iconify-icons/keyline-icons/circle-check'
import clock from '@iconify-icons/keyline-icons/clock'
import creditCard from '@iconify-icons/keyline-icons/credit-card'
import listCheck from '@iconify-icons/keyline-icons/list-check'
import plus from '@iconify-icons/keyline-icons/plus'
import users from '@iconify-icons/keyline-icons/users'
import type { IconifyIcon } from '@iconify/react'
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { Failure } from '../../components/common/Feedback'
import { useInvitations } from '../../features/invitations/hooks/useInvitations'
import { useDeals } from '../../features/deals/hooks/useDeals'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useSubscriptionOverview } from '../../features/subscriptions'
import { useCompleteTask, useReopenTask, useTasks } from '../../features/tasks'
import { INVITATION_STATUS } from '../../types/invitation.types'
import type { CrmTask } from '../../types/task.types'

import { QuickLink, Surface, TaskRow, TextLink } from './DashboardComponents'

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const workspace = useWorkspace()
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
  const [dealView, setDealView] = useState<'no_next_action' | 'closing_this_month'>(
    'no_next_action',
  )
  const monthRange = useMemo(() => {
    const now = new Date()
    const format = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    return {
      from: format(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: format(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
  }, [])
  const missingActionDeals = useDeals(workspace.id, {
    archived: 'active',
    nextAction: 'missing',
    limit: 5,
  })
  const closingDeals = useDeals(workspace.id, {
    archived: 'active',
    expectedCloseFrom: monthRange.from,
    expectedCloseTo: monthRange.to,
    limit: 5,
  })
  const selectedDeals = dealView === 'no_next_action' ? missingActionDeals : closingDeals
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
  const visibleQueue = queue.slice(0, 5)
  const tasksError = overdueTasks.error || todayTasks.error
  const pendingInvitations = (invitations.data ?? []).filter(
    (item) => item.status === INVITATION_STATUS.PENDING,
  )
  const date = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const attentionItems: Array<{ label: string; value: number; icon: IconifyIcon }> = [
    {
      label: t('crm.dashboard.overdueCharges'),
      value: billing.data?.overdue_charges ?? 0,
      icon: creditCard,
    },
    {
      label: t('crm.dashboard.renewals'),
      value: billing.data?.renewals_next_30_days ?? 0,
      icon: calendar,
    },
    {
      label: t('crm.dashboard.scheduledCancellations'),
      value: billing.data?.scheduled_cancellations ?? 0,
      icon: clock,
    },
  ]

  function completeTask(task: CrmTask) {
    complete.mutate(task.id, { onSuccess: () => setCompletedTask(task) })
  }
  function undoCompletion() {
    if (!completedTask) return
    reopen.mutate(completedTask.id, { onSuccess: () => setCompletedTask(null) })
  }

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
          <Typography
            component="h1"
            sx={{
              maxWidth: 760,
              fontFamily: (theme) => theme.typography.h1.fontFamily,
              fontSize: { xs: '2rem', sm: '2.5rem' },
              fontWeight: 780,
              letterSpacing: '-.035em',
              lineHeight: 1.05,
            }}
          >
            {t('crm.dashboard.myWork')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.dashboard.myWorkDescription')}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, textTransform: 'capitalize' }}
          >
            {date}
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
          gridTemplateAreas: {
            xs: '"tasks" "deals" "attention"',
            lg: '"tasks attention" "deals attention"',
          },
          gap: 2,
          mt: { xs: 4, md: 5 },
          alignItems: 'start',
        }}
      >
        <Surface
          component="section"
          aria-labelledby="focus-heading"
          sx={{ overflow: 'hidden', gridArea: 'tasks' }}
        >
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
              <Typography id="focus-heading" component="h2" variant="h4">
                {t('crm.dashboard.focus')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t('crm.dashboard.daySummary', {
                  overdue: overdueTasks.data?.length ?? 0,
                  today: todayTasks.data?.length ?? 0,
                })}
              </Typography>
            </Box>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
              <AppIcon icon={listCheck} size={22} />
              <TextLink
                to="/organizations/$organizationId/tasks"
                organizationId={workspace.id}
                search={{ view: 'focus', owner: 'me' }}
              >
                {t('crm.dashboard.allTasks')}
              </TextLink>
            </Stack>
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
          ) : todayTasks.isPending || overdueTasks.isPending ? (
            <Stack spacing={0.5} sx={{ p: 2 }}>
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} variant="rounded" height={70} />
              ))}
            </Stack>
          ) : visibleQueue.length ? (
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
              <AppIcon icon={checkCircle} size={30} />
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

        <Surface
          component="section"
          aria-labelledby="attention-heading"
          sx={{ p: { xs: 2.5, md: 3 }, gridArea: 'attention' }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
          >
            <Typography id="attention-heading" component="h2" variant="h4">
              {t('crm.dashboard.attention')}
            </Typography>
            <AppIcon icon={bell} size={22} />
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
              {attentionItems.map(({ label, value, icon }) => (
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
                    <AppIcon icon={icon} size={19} />
                  </Box>
                  <Typography sx={{ flex: 1 }} color="text.secondary">
                    {label}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {value}
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
          {canManagePeople && pendingInvitations.length ? (
            <Box sx={{ mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.5 }}>
                <AppIcon icon={users} size={21} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h3" sx={{ fontWeight: 750 }}>
                    {t('crm.dashboard.invitations')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {t('crm.dashboard.pendingInvitationCount', {
                      count: pendingInvitations.length,
                    })}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <TextLink
                      to="/organizations/$organizationId/members"
                      organizationId={workspace.id}
                    >
                      {t('crm.dashboard.manageInvitations')}
                    </TextLink>
                  </Box>
                </Box>
              </Stack>
            </Box>
          ) : null}
        </Surface>
        <Surface
          component="section"
          aria-labelledby="deals-to-move-heading"
          sx={{ overflow: 'hidden', gridArea: 'deals' }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              p: { xs: 2, sm: 2.5 },
              gap: 1.5,
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Typography id="deals-to-move-heading" component="h2" variant="h4">
              {t('crm.dashboard.dealsToMove')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={dealView}
              onChange={(_, next) => {
                if (next) setDealView(next)
              }}
              aria-label={t('crm.dashboard.dealsToMove')}
            >
              <ToggleButton value="no_next_action">
                {t('crm.dashboard.missingNextAction')}
              </ToggleButton>
              <ToggleButton value="closing_this_month">
                {t('crm.dashboard.closingThisMonth')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          {selectedDeals.isPending ? (
            <Stack spacing={1} sx={{ p: 2 }}>
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} height={52} />
              ))}
            </Stack>
          ) : selectedDeals.isError ? (
            <Box sx={{ p: 2 }}>
              <Failure error={selectedDeals.error} retry={() => void selectedDeals.refetch()} />
            </Box>
          ) : selectedDeals.data?.length ? (
            selectedDeals.data.slice(0, 5).map((deal) => (
              <Box
                key={deal.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0,1fr)',
                    sm: 'minmax(0,1.6fr) minmax(0,1fr) auto auto',
                  },
                  gap: { xs: 0.25, sm: 2 },
                  px: { xs: 2, sm: 2.5 },
                  py: 1.5,
                  borderTop: 1,
                  borderColor: 'divider',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 750 }} noWrap>
                    {deal.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {deal.company_name}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {new Intl.NumberFormat(i18n.language, {
                    style: 'currency',
                    currency: deal.currency,
                    maximumFractionDigits: 0,
                  }).format(Number(deal.net_value))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {deal.expected_close_date
                    ? new Intl.DateTimeFormat(i18n.language).format(
                        new Date(`${deal.expected_close_date}T00:00:00`),
                      )
                    : '—'}
                </Typography>
                <Box>
                  <TextLink
                    to="/organizations/$organizationId/deals"
                    organizationId={workspace.id}
                    search={{ view: dealView, deal: deal.id }}
                  >
                    {t('crm.dashboard.openDeal')}
                  </TextLink>
                </Box>
              </Box>
            ))
          ) : (
            <Typography
              color="text.secondary"
              sx={{ px: 2.5, py: 3, borderTop: 1, borderColor: 'divider' }}
            >
              {t('crm.dashboard.noDealsToMove')}
            </Typography>
          )}
          <Box sx={{ px: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <TextLink
              to="/organizations/$organizationId/deals"
              organizationId={workspace.id}
              search={{ view: dealView }}
            >
              {t('crm.dashboard.viewDeals')}
            </TextLink>
          </Box>
        </Surface>
      </Box>
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
