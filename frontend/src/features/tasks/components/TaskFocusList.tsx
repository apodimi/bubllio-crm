import { Box, ButtonBase, Checkbox, MenuItem, Select, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CrmTask, TaskWorkflowStatus } from '../../../types/task.types'
import type { TaskGroup } from '../taskListConfig'

function formatDueDate(value: string, language: string, now = new Date()) {
  const due = new Date(value)
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const startTomorrow = new Date(startToday)
  startTomorrow.setDate(startTomorrow.getDate() + 1)
  const startDayAfter = new Date(startTomorrow)
  startDayAfter.setDate(startDayAfter.getDate() + 1)
  const time = new Intl.DateTimeFormat(language, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(due)

  if (due >= startToday && due < startTomorrow) return { key: 'today' as const, time }
  if (due >= startTomorrow && due < startDayAfter) return { key: 'tomorrow' as const, time }
  return {
    key: 'date' as const,
    date: new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(due),
    time,
  }
}

function TaskRow({
  task,
  canManage,
  completing,
  statusPending,
  onToggle,
  onStatusChange,
  onOpen,
}: {
  task: CrmTask
  canManage: boolean
  completing: boolean
  statusPending: boolean
  onToggle: (task: CrmTask) => void
  onStatusChange: (task: CrmTask, status: TaskWorkflowStatus) => void
  onOpen: (task: CrmTask) => void
}) {
  const { t, i18n } = useTranslation()
  const overdue = task.effective_status === 'overdue'
  const due = formatDueDate(task.due_at, i18n.resolvedLanguage ?? 'en')
  const relationship = [task.company_name, task.deal_title || task.contact_name]
    .filter(Boolean)
    .join(' · ')
  let dueLabel = t('crm.tasks.dueDate', {
    date: due.key === 'date' ? due.date : '',
    time: due.time,
  })
  if (due.key === 'today') dueLabel = t('crm.tasks.dueToday', { time: due.time })
  if (due.key === 'tomorrow') dueLabel = t('crm.tasks.dueTomorrow', { time: due.time })

  return (
    <Stack
      direction="row"
      sx={{
        position: 'relative',
        display: { xs: 'grid', sm: 'flex' },
        gridTemplateColumns: { xs: '44px minmax(0, 1fr) 108px' },
        columnGap: { xs: 0.75, sm: 0 },
        minHeight: { xs: 92, md: 68 },
        px: { xs: 1, sm: 1.5, md: 2 },
        py: { xs: 1, sm: 0 },
        alignItems: 'center',
        borderTop: 1,
        borderColor: 'divider',
        transition: 'background-color 140ms ease-out',
        '&::before': overdue
          ? {
              content: '""',
              position: 'absolute',
              insetBlock: 0,
              insetInlineStart: 0,
              width: '2px',
              bgcolor: 'error.main',
            }
          : undefined,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Checkbox
        checked={Boolean(task.completed_at)}
        disabled={!canManage || completing}
        slotProps={{
          input: {
            'aria-label': t(task.completed_at ? 'crm.tasks.reopenTask' : 'crm.tasks.completeTask', {
              title: task.title,
            }),
          },
        }}
        onChange={() => onToggle(task)}
        sx={{
          gridArea: { xs: '1 / 1 / span 2 / 2' },
          alignSelf: 'center',
          mr: { sm: 0.75 },
        }}
      />
      <Box sx={{ gridArea: { xs: '1 / 2 / 2 / 4' }, minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <ButtonBase
            onClick={() => onOpen(task)}
            sx={{
              minWidth: 0,
              justifyContent: 'flex-start',
              borderRadius: 0.5,
              textAlign: 'left',
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
            }}
          >
            <Typography
              noWrap
              sx={{
                minWidth: 0,
                fontWeight: 700,
                textDecoration: task.completed_at ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </Typography>
          </ButtonBase>
          {task.priority === 'high' || task.priority === 'urgent' ? (
            <Box
              aria-label={t(`crm.tasks.priority.${task.priority}`)}
              sx={{
                width: 7,
                height: 7,
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: task.priority === 'urgent' ? 'error.main' : 'warning.main',
              }}
            />
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>
          {relationship}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        noWrap
        sx={{ display: { xs: 'none', lg: 'block' }, width: 132, ml: 2 }}
      >
        {task.assigned_to_name || t('crm.tasks.unassigned')}
      </Typography>
      <Typography
        variant="caption"
        color={overdue ? 'error.main' : 'text.secondary'}
        noWrap
        sx={{
          gridArea: { xs: '2 / 2 / 3 / 3' },
          width: { xs: 'auto', sm: 150 },
          ml: { sm: 1 },
          textAlign: { xs: 'left', sm: 'right' },
          fontWeight: overdue ? 700 : 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {dueLabel}
      </Typography>
      <Select
        size="small"
        value={task.workflow_status}
        disabled={!canManage || statusPending}
        onChange={(event) => onStatusChange(task, event.target.value as TaskWorkflowStatus)}
        inputProps={{
          'aria-label': t('crm.tasks.changeStatus', { title: task.title }),
        }}
        sx={{
          gridArea: { xs: '2 / 3 / 3 / 4' },
          width: { xs: 108, sm: 132 },
          ml: { sm: 1 },
          '& .MuiSelect-select': {
            minHeight: 'auto',
            py: 0.75,
            pr: { xs: '28px !important', sm: '32px !important' },
            pl: { xs: 0.75, sm: 1.25 },
            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
          },
        }}
      >
        {(['todo', 'in_progress', 'waiting', 'completed'] as TaskWorkflowStatus[]).map((status) => (
          <MenuItem key={status} value={status}>
            {t(`crm.tasks.status.${status}`)}
          </MenuItem>
        ))}
      </Select>
    </Stack>
  )
}

export function TaskFocusList({
  groups,
  canManage,
  pendingTaskId,
  movingTaskId,
  onToggle,
  onStatusChange,
  onOpen,
}: {
  groups: TaskGroup[]
  canManage: boolean
  pendingTaskId?: string
  movingTaskId?: string
  onToggle: (task: CrmTask) => void
  onStatusChange: (task: CrmTask, status: TaskWorkflowStatus) => void
  onOpen: (task: CrmTask) => void
}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  return (
    <Box>
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key)
        return (
          <Box key={group.key}>
            <ButtonBase
              onClick={() =>
                setCollapsed((current) => {
                  const next = new Set(current)
                  if (next.has(group.key)) next.delete(group.key)
                  else next.add(group.key)
                  return next
                })
              }
              aria-expanded={!isCollapsed}
              sx={{
                width: '100%',
                minHeight: 44,
                px: { xs: 1.5, md: 2 },
                justifyContent: 'space-between',
                bgcolor: 'background.default',
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
                <Typography sx={{ fontWeight: 750 }}>
                  {t(`crm.tasks.groups.${group.key}`)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {group.tasks.length}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t(isCollapsed ? 'crm.tasks.showGroup' : 'crm.tasks.hideGroup')}
              </Typography>
            </ButtonBase>
            {!isCollapsed
              ? group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    canManage={canManage}
                    completing={pendingTaskId === task.id}
                    statusPending={movingTaskId === task.id}
                    onToggle={onToggle}
                    onStatusChange={onStatusChange}
                    onOpen={onOpen}
                  />
                ))
              : null}
          </Box>
        )
      })}
    </Box>
  )
}
