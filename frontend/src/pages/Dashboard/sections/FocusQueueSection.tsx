import checkCircle from '@iconify-icons/keyline-icons/circle-check'
import listCheck from '@iconify-icons/keyline-icons/list-check'
import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import { Failure } from '../../../components/common/Feedback'
import type { CrmTask } from '../../../types/task.types'

import { Surface, TaskRow, TextLink } from '../DashboardComponents'

export interface FocusQueueViewModel {
  tasks: CrmTask[]
  totalCount: number
  overdueCount: number
  todayCount: number
  overdueTaskIds: ReadonlySet<string>
  isPending: boolean
  error: Error | null
  retry: () => void
}

interface FocusQueueSectionProps {
  organizationId: string
  canManage: boolean
  queue: FocusQueueViewModel
  completingTaskId?: string
  reschedulingTaskId?: string
  onComplete: (task: CrmTask) => void
  onLogCommunication: (task: CrmTask) => void
  onSnooze: (task: CrmTask) => void
}

export function FocusQueueSection({
  organizationId,
  canManage,
  queue,
  completingTaskId,
  reschedulingTaskId,
  onComplete,
  onLogCommunication,
  onSnooze,
}: FocusQueueSectionProps) {
  const { t } = useTranslation()

  return (
    <Surface component="section" aria-labelledby="focus-heading" sx={{ overflow: 'hidden' }}>
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
              overdue: queue.overdueCount,
              today: queue.todayCount,
            })}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <AppIcon icon={listCheck} size={22} />
          <TextLink
            to="/organizations/$organizationId/tasks"
            organizationId={organizationId}
            search={{ view: 'focus', owner: 'me' }}
          >
            {t('crm.dashboard.allTasks')}
          </TextLink>
        </Stack>
      </Stack>
      {queue.error ? (
        <Box sx={{ p: 2 }}>
          <Failure error={queue.error} retry={queue.retry} />
        </Box>
      ) : queue.isPending ? (
        <Stack spacing={0.5} sx={{ p: 2 }}>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="rounded" height={70} />
          ))}
        </Stack>
      ) : queue.tasks.length ? (
        queue.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            organizationId={organizationId}
            isOverdue={queue.overdueTaskIds.has(task.id)}
            canManage={canManage}
            pending={completingTaskId === task.id || reschedulingTaskId === task.id}
            onComplete={onComplete}
            onLogCommunication={onLogCommunication}
            onSnooze={onSnooze}
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
      {queue.totalCount > queue.tasks.length ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider' }}
        >
          {t('crm.dashboard.moreTasks', { count: queue.totalCount - queue.tasks.length })}
        </Typography>
      ) : null}
    </Surface>
  )
}
