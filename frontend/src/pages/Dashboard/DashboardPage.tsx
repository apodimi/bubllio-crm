import { useMemo, useState } from 'react'
import building from '@iconify-icons/keyline-icons/building'
import plus from '@iconify-icons/keyline-icons/plus'
import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useCompanyAttention } from '../../features/companies/hooks/useCompanies'
import { useDeals } from '../../features/deals/hooks/useDeals'
import { useInvitations } from '../../features/invitations/hooks/useInvitations'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useSubscriptionOverview } from '../../features/subscriptions'
import { useCompleteTask, useReopenTask, useRescheduleTask, useTasks } from '../../features/tasks'
import type { Company } from '../../types/company.types'
import { INVITATION_STATUS } from '../../types/invitation.types'
import type { CrmTask } from '../../types/task.types'

import { QuickLink } from './DashboardComponents'
import { DashboardOverlays } from './DashboardOverlays'
import { BillingAttentionSection } from './sections/BillingAttentionSection'
import { CustomersAttentionSection } from './sections/CustomersAttentionSection'
import { DealsToMoveSection, type DashboardDealView } from './sections/DealsToMoveSection'
import { FocusQueueSection } from './sections/FocusQueueSection'

const DASHBOARD_LIST_LIMIT = 5

function toLocalDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function getCurrentMonthRange() {
  const now = new Date()
  return {
    from: toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const workspace = useWorkspace()
  const billing = useSubscriptionOverview(workspace.id)
  const todayTasks = useTasks(workspace.id, { bucket: 'today', assignedTo: 'me' })
  const overdueTasks = useTasks(workspace.id, { bucket: 'overdue', assignedTo: 'me' })
  const companyAttention = useCompanyAttention(workspace.id)
  const complete = useCompleteTask(workspace.id)
  const reopen = useReopenTask(workspace.id)
  const reschedule = useRescheduleTask(workspace.id)
  const canManage = canCreateRecords(workspace)
  const canManagePeople =
    workspace.current_user_role === 'owner' || workspace.current_user_role === 'admin'
  const invitations = useInvitations(workspace.id, canManagePeople)
  const [completedTask, setCompletedTask] = useState<CrmTask | null>(null)
  const [communicationTask, setCommunicationTask] = useState<CrmTask | null>(null)
  const [snoozedTask, setSnoozedTask] = useState<CrmTask | null>(null)
  const [communicationSaved, setCommunicationSaved] = useState(false)
  const [attentionCommunicationCompany, setAttentionCommunicationCompany] =
    useState<Company | null>(null)
  const [nextActionCompany, setNextActionCompany] = useState<Company | null>(null)
  const [dealView, setDealView] = useState<DashboardDealView>('no_next_action')
  const monthRange = useMemo(getCurrentMonthRange, [])
  const missingActionDeals = useDeals(workspace.id, {
    archived: 'active',
    nextAction: 'missing',
    limit: DASHBOARD_LIST_LIMIT,
  })
  const closingDeals = useDeals(workspace.id, {
    archived: 'active',
    expectedCloseFrom: monthRange.from,
    expectedCloseTo: monthRange.to,
    limit: DASHBOARD_LIST_LIMIT,
  })
  const selectedDeals = dealView === 'no_next_action' ? missingActionDeals : closingDeals
  const overdueIds = useMemo(
    () => new Set((overdueTasks.data ?? []).map((task) => task.id)),
    [overdueTasks.data],
  )
  const taskQueue = useMemo(
    () => [
      ...(overdueTasks.data ?? []),
      ...(todayTasks.data ?? []).filter((task) => !overdueIds.has(task.id)),
    ],
    [overdueIds, overdueTasks.data, todayTasks.data],
  )
  const pendingInvitationCount = (invitations.data ?? []).filter(
    (item) => item.status === INVITATION_STATUS.PENDING,
  ).length
  const date = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  function completeTask(task: CrmTask) {
    complete.mutate(task.id, { onSuccess: () => setCompletedTask(task) })
  }

  function undoCompletion() {
    if (!completedTask) {
      return
    }
    reopen.mutate(completedTask.id, { onSuccess: () => setCompletedTask(null) })
  }

  function snoozeUntilTomorrow(task: CrmTask) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    reschedule.mutate(
      { taskId: task.id, dueAt: tomorrow.toISOString() },
      { onSuccess: () => setSnoozedTask(task) },
    )
  }

  function markCommunicationSaved(closeDialog: () => void) {
    closeDialog()
    setCommunicationSaved(true)
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
              fontSize: { xs: '1.75rem', sm: '2rem' },
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
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
          mt: { xs: 4, md: 5 },
          alignItems: 'start',
        }}
      >
        <Stack sx={{ minWidth: 0, gap: 2 }}>
          <FocusQueueSection
            organizationId={workspace.id}
            canManage={canManage}
            queue={{
              tasks: taskQueue.slice(0, DASHBOARD_LIST_LIMIT),
              totalCount: taskQueue.length,
              overdueCount: overdueTasks.data?.length ?? 0,
              todayCount: todayTasks.data?.length ?? 0,
              overdueTaskIds: overdueIds,
              isPending: todayTasks.isPending || overdueTasks.isPending,
              error: overdueTasks.error || todayTasks.error,
              retry: () => {
                void overdueTasks.refetch()
                void todayTasks.refetch()
              },
            }}
            completingTaskId={complete.isPending ? complete.variables : undefined}
            reschedulingTaskId={reschedule.isPending ? reschedule.variables?.taskId : undefined}
            onComplete={completeTask}
            onLogCommunication={setCommunicationTask}
            onSnooze={snoozeUntilTomorrow}
          />
          <CustomersAttentionSection
            canManage={canManage}
            attention={{
              items: companyAttention.data,
              isPending: companyAttention.isPending,
              error: companyAttention.error,
              retry: () => void companyAttention.refetch(),
            }}
            onLogCommunication={setAttentionCommunicationCompany}
            onAddFollowUp={setNextActionCompany}
          />
        </Stack>

        <Stack sx={{ minWidth: 0, gap: 2 }}>
          <BillingAttentionSection
            organizationId={workspace.id}
            overview={billing.data}
            isPending={billing.isPending}
            error={billing.error}
            retry={() => void billing.refetch()}
            canManagePeople={canManagePeople}
            pendingInvitationCount={pendingInvitationCount}
          />
          <DealsToMoveSection
            organizationId={workspace.id}
            value={dealView}
            deals={{
              items: selectedDeals.data,
              isPending: selectedDeals.isPending,
              error: selectedDeals.error,
              retry: () => void selectedDeals.refetch(),
            }}
            onChange={setDealView}
          />
        </Stack>
      </Box>
      <DashboardOverlays
        organizationId={workspace.id}
        completedTask={completedTask}
        communicationTask={communicationTask}
        snoozedTask={snoozedTask}
        communicationSaved={communicationSaved}
        attentionCommunicationCompany={attentionCommunicationCompany}
        nextActionCompany={nextActionCompany}
        isUndoPending={reopen.isPending}
        hasCompleteError={complete.isError}
        hasUndoError={reopen.isError}
        hasRescheduleError={reschedule.isError}
        onUndoCompletion={undoCompletion}
        onDismissCompletedTask={() => setCompletedTask(null)}
        onDismissSnoozedTask={() => setSnoozedTask(null)}
        onDismissCommunicationSaved={() => setCommunicationSaved(false)}
        onCloseCommunicationTask={() => setCommunicationTask(null)}
        onSaveCommunicationTask={() => markCommunicationSaved(() => setCommunicationTask(null))}
        onCloseAttentionCommunication={() => setAttentionCommunicationCompany(null)}
        onSaveAttentionCommunication={() =>
          markCommunicationSaved(() => setAttentionCommunicationCompany(null))
        }
        onCloseNextAction={() => setNextActionCompany(null)}
        onSaveNextAction={() => {
          setNextActionCompany(null)
          void companyAttention.refetch()
        }}
      />
    </Box>
  )
}
