import { useState } from 'react'
import AddRounded from '@mui/icons-material/AddRounded'
import CallRounded from '@mui/icons-material/CallRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import EmailRounded from '@mui/icons-material/EmailRounded'
import EventRounded from '@mui/icons-material/EventRounded'
import TaskAltRounded from '@mui/icons-material/TaskAltRounded'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { useCompanies } from '../../features/companies'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useCompleteTask, useReopenTask, useTasks } from '../../features/tasks'
import type { TaskBucket } from '../../features/tasks'
import { TaskDrawer } from '../../features/tasks/components/TaskDrawer'
import type { CrmTask, TaskKind } from '../../types/task.types'

const tabs: Array<{ value: TaskBucket; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'open', label: 'All open' },
  { value: 'completed', label: 'Completed' },
]

const kindIcons: Record<TaskKind, typeof TaskAltRounded> = {
  task: TaskAltRounded,
  call: CallRounded,
  email: EmailRounded,
  meeting: EventRounded,
}

const dueLabel = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export function TasksPage() {
  const organization = useWorkspace()
  const canManage = canCreateRecords(organization)
  const [bucket, setBucket] = useState<TaskBucket>('today')
  const [owner, setOwner] = useState<'me' | 'all' | 'unassigned'>('me')
  const [kind, setKind] = useState<TaskKind | 'all'>('all')
  const [drawer, setDrawer] = useState<CrmTask | true | null>(null)
  const tasks = useTasks(organization.id, {
    bucket,
    assignedTo: owner === 'all' ? '' : owner,
    kind: kind === 'all' ? '' : kind,
  })
  const companies = useCompanies(organization.id, { archived: 'active' })
  const complete = useCompleteTask(organization.id)
  const reopen = useReopenTask(organization.id)
  const mutationError = complete.error || reopen.error

  async function toggleComplete(task: CrmTask) {
    try {
      if (task.completed_at) await reopen.mutateAsync(task.id)
      else await complete.mutateAsync(task.id)
    } catch {
      /* Normalized API error is rendered below. */
    }
  }

  const rows = tasks.data ?? []
  return (
    <>
      <PageHeading
        title="Tasks & follow-ups"
        description="See the next commitment, the person responsible and what is already late."
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              disabled={!companies.data?.length}
              onClick={() => setDrawer(true)}
            >
              Add task
            </Button>
          ) : null
        }
      />
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={bucket}
          onChange={(_, value: TaskBucket) => setBucket(value)}
          aria-label="Task date filters"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ p: 2, bgcolor: 'action.hover' }}
        >
          <TextField
            select
            size="small"
            label="Owner"
            value={owner}
            onChange={(event) => setOwner(event.target.value as typeof owner)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="me">My tasks</MenuItem>
            <MenuItem value="all">Everyone</MenuItem>
            <MenuItem value="unassigned">Unassigned</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Activity"
            value={kind}
            onChange={(event) => setKind(event.target.value as TaskKind | 'all')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All activities</MenuItem>
            <MenuItem value="task">Tasks</MenuItem>
            <MenuItem value="call">Calls</MenuItem>
            <MenuItem value="email">Emails</MenuItem>
            <MenuItem value="meeting">Meetings</MenuItem>
          </TextField>
        </Stack>
      </Paper>
      {mutationError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutationError.message}
        </Alert>
      ) : null}
      {tasks.isPending || companies.isPending ? (
        <Loading />
      ) : tasks.isError ? (
        <Failure error={tasks.error} retry={() => void tasks.refetch()} />
      ) : rows.length === 0 ? (
        <Empty
          title={bucket === 'today' ? 'Your day is clear' : 'No tasks in this view'}
          description={
            bucket === 'today'
              ? 'Add the next action for a customer or deal when you are ready.'
              : 'Try another date, owner or activity filter.'
          }
        />
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
            {rows.map((task) => {
              const KindIcon = kindIcons[task.kind]
              const isPending =
                (complete.isPending && complete.variables === task.id) ||
                (reopen.isPending && reopen.variables === task.id)
              return (
                <Stack
                  key={task.id}
                  direction="row"
                  spacing={1.5}
                  onClick={canManage ? () => setDrawer(task) : undefined}
                  sx={{
                    alignItems: 'center',
                    px: { xs: 1.5, sm: 2.5 },
                    py: 1.75,
                    cursor: canManage ? 'pointer' : 'default',
                    transition: 'background-color 160ms ease-out',
                    '&:hover': { bgcolor: canManage ? 'action.hover' : undefined },
                  }}
                >
                  <Checkbox
                    checked={Boolean(task.completed_at)}
                    disabled={!canManage || isPending}
                    slotProps={{
                      input: {
                        'aria-label': `${task.completed_at ? 'Reopen' : 'Complete'} ${task.title}`,
                      },
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => void toggleComplete(task)}
                    icon={<TaskAltRounded />}
                    checkedIcon={<CheckCircleRounded />}
                  />
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 38,
                      height: 38,
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                    }}
                  >
                    <KindIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 700,
                          textDecoration: task.completed_at ? 'line-through' : 'none',
                          color: task.completed_at ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {task.title}
                      </Typography>
                      {task.priority !== 'normal' ? (
                        <Chip
                          size="small"
                          label={task.priority}
                          color={task.priority === 'urgent' ? 'error' : 'warning'}
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {task.company_name}
                      {task.deal_title ? ` · ${task.deal_title}` : ''}
                      {task.contact_name ? ` · ${task.contact_name}` : ''}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={task.effective_status === 'overdue' ? 'error.main' : 'text.secondary'}
                      sx={{
                        display: { xs: 'block', md: 'none' },
                        mt: 0.35,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {dueLabel(task.due_at)} · {task.assigned_to_name || 'Unassigned'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
                    <Typography
                      variant="body2"
                      color={task.effective_status === 'overdue' ? 'error.main' : 'text.primary'}
                      sx={{
                        fontWeight: task.effective_status === 'overdue' ? 700 : 500,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {dueLabel(task.due_at)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.assigned_to_name || 'Unassigned'}
                    </Typography>
                  </Box>
                  {canManage ? (
                    <Tooltip title="Edit task">
                      <IconButton
                        aria-label={`Edit ${task.title}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setDrawer(task)
                        }}
                      >
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              )
            })}
          </Stack>
        </Paper>
      )}
      {drawer && companies.data ? (
        <TaskDrawer
          organizationId={organization.id}
          companies={companies.data}
          task={drawer === true ? undefined : drawer}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </>
  )
}
