import { useMemo, useState } from 'react'
import filterIcon from '@iconify-icons/keyline-icons/filter'
import listIcon from '@iconify-icons/keyline-icons/list'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import searchIcon from '@iconify-icons/keyline-icons/search'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Alert,
  Box,
  Button,
  Collapse,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { EntityListViewTabs } from '../../components/common/EntityListControls'
import { Empty, Failure, Loading } from '../../components/common/Feedback'
import { useCompanies } from '../../features/companies'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import {
  useCompleteTask,
  useMoveTask,
  useReopenTask,
  useTasks,
  type TaskBucket,
} from '../../features/tasks'
import { TaskBoard } from '../../features/tasks/components/TaskBoard'
import { TaskDetailsDrawer } from '../../features/tasks/components/TaskDetailsDrawer'
import { TaskDrawer } from '../../features/tasks/components/TaskDrawer'
import { TaskFocusList } from '../../features/tasks/components/TaskFocusList'
import { filterTasks, groupTasks, type TaskView } from '../../features/tasks/taskListConfig'
import type { CrmTask, TaskKind, TaskWorkflowStatus } from '../../types/task.types'

type TaskLayout = 'list' | 'board'
const taskViews: TaskView[] = ['focus', 'upcoming', 'all', 'completed']

export function TasksPage() {
  const { t } = useTranslation()
  const organization = useWorkspace()
  const navigate = useNavigate({ from: '/organizations/$organizationId/tasks' })
  const routeSearch = useSearch({ from: '/organizations/$organizationId/tasks' })
  const canManage = canCreateRecords(organization)
  const preferenceKey = `bubllio:tasks-view:v2:${organization.id}`
  const [layout, setLayout] = useState<TaskLayout>(() => {
    try {
      return localStorage.getItem(preferenceKey) === 'board' ? 'board' : 'list'
    } catch {
      return 'list'
    }
  })
  const [view, setView] = useState<TaskView>('focus')
  const [owner, setOwner] = useState<'me' | 'all' | 'unassigned'>('me')
  const [kind, setKind] = useState<TaskKind | 'all'>('all')
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detailsTask, setDetailsTask] = useState<CrmTask | null>(null)
  const [drawer, setDrawer] = useState<CrmTask | true | null>(
    routeSearch.create === true ? true : null,
  )

  let bucket: TaskBucket = 'open'
  if (view === 'upcoming') bucket = 'upcoming'
  if (view === 'completed') bucket = 'completed'
  const tasks = useTasks(organization.id, {
    bucket,
    assignedTo: owner === 'all' ? '' : owner,
    kind: kind === 'all' ? '' : kind,
  })
  const companies = useCompanies(organization.id, { archived: 'active' })
  const complete = useCompleteTask(organization.id)
  const reopen = useReopenTask(organization.id)
  const move = useMoveTask(organization.id)
  const rows = useMemo(() => filterTasks(tasks.data ?? [], query), [query, tasks.data])
  const groups = useMemo(() => groupTasks(rows, view), [rows, view])
  const summary = useMemo(() => {
    const endOfToday = new Date()
    endOfToday.setHours(24, 0, 0, 0)
    let overdue = 0
    let today = 0
    for (const task of rows) {
      if (task.completed_at) continue
      if (task.effective_status === 'overdue') overdue += 1
      else if (new Date(task.due_at) < endOfToday) today += 1
    }
    return { overdue, today }
  }, [rows])
  const mutationError = complete.error || reopen.error || move.error
  const pendingTaskId = (complete.variables || reopen.variables) as string | undefined
  const activeFilterCount = Number(owner !== 'me') + Number(kind !== 'all')

  function changeLayout(next: TaskLayout) {
    setLayout(next)
    try {
      localStorage.setItem(preferenceKey, next)
    } catch {
      // A disabled local store should not block task management.
    }
  }

  function clearFilters() {
    setOwner('me')
    setKind('all')
  }

  async function toggleComplete(task: CrmTask) {
    try {
      if (task.completed_at) await reopen.mutateAsync(task.id)
      else await complete.mutateAsync(task.id)
    } catch {
      // Normalized API error is rendered below.
    }
  }

  async function moveTask(task: CrmTask, workflowStatus: TaskWorkflowStatus) {
    try {
      await move.mutateAsync({ taskId: task.id, workflowStatus })
    } catch {
      // Normalized API error is rendered below.
    }
  }

  const content = (() => {
    if (tasks.isPending || companies.isPending) return <Loading />
    if (tasks.isError) return <Failure error={tasks.error} retry={() => void tasks.refetch()} />
    if (rows.length === 0) {
      return (
        <Empty
          title={query ? t('crm.tasks.noMatches') : t('crm.tasks.empty')}
          description={
            query ? t('crm.tasks.noMatchesDescription') : t('crm.tasks.emptyDescription')
          }
        />
      )
    }
    if (layout === 'board') {
      return (
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <TaskBoard
            tasks={rows}
            canManage={canManage}
            moving={move.isPending}
            onMove={(task, status) => void moveTask(task, status)}
            onEdit={setDrawer}
          />
        </Box>
      )
    }
    return (
      <TaskFocusList
        groups={groups}
        canManage={canManage}
        pendingTaskId={pendingTaskId}
        movingTaskId={move.variables?.taskId}
        onToggle={(task) => void toggleComplete(task)}
        onStatusChange={(task, status) => void moveTask(task, status)}
        onOpen={setDetailsTask}
      />
    )
  })()

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ mb: 2.5, gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Typography component="h1" variant="h2">
              {t('crm.tasks.title')}
            </Typography>
            {!tasks.isPending ? (
              <Typography variant="body2" color="text.secondary">
                {t('crm.tasks.count', { count: rows.length })}
              </Typography>
            ) : null}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.tasks.description')}
          </Typography>
        </Box>
        {canManage ? (
          <Button
            variant="contained"
            startIcon={<AppIcon icon={plusIcon} />}
            disabled={!companies.data?.length}
            onClick={() => setDrawer(true)}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            {t('crm.tasks.add')}
          </Button>
        ) : null}
      </Stack>

      {mutationError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutationError.message}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <EntityListViewTabs
          label={t('crm.tasks.views')}
          options={taskViews.map((item) => ({ value: item, label: t(`crm.tasks.view.${item}`) }))}
          value={view}
          onChange={setView}
        />

        <Stack
          direction="row"
          useFlexGap
          sx={{ px: { xs: 1.25, sm: 2 }, pb: 2, gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('crm.tasks.searchPlaceholder')}
            slotProps={{
              htmlInput: { 'aria-label': t('crm.tasks.search') },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <AppIcon icon={searchIcon} size={18} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 0, flex: { xs: '1 0 100%', md: 1 } }}
          />
          <Button
            variant="outlined"
            startIcon={<AppIcon icon={filterIcon} size={17} />}
            aria-expanded={filtersOpen}
            aria-controls="task-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {t('crm.tasks.filters')}
            {activeFilterCount ? ` · ${activeFilterCount}` : ''}
          </Button>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={layout}
            onChange={(_, next: TaskLayout | null) => {
              if (next) changeLayout(next)
            }}
            aria-label={t('crm.tasks.layout')}
            sx={{ ml: 'auto' }}
          >
            <ToggleButton value="list">
              <AppIcon icon={listIcon} size={16} />
              <Box component="span" sx={{ ml: 0.75 }}>
                {t('crm.tasks.list')}
              </Box>
            </ToggleButton>
            <ToggleButton value="board">{t('crm.tasks.board')}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Collapse in={filtersOpen}>
          <Stack
            id="task-filters"
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ px: { xs: 1.25, sm: 2 }, pb: 2, gap: 1, alignItems: { sm: 'center' } }}
          >
            <TextField
              select
              label={t('crm.tasks.owner')}
              value={owner}
              onChange={(event) => setOwner(event.target.value as typeof owner)}
              sx={{ minWidth: { sm: 190 } }}
            >
              <MenuItem value="me">{t('crm.tasks.myTasks')}</MenuItem>
              <MenuItem value="all">{t('crm.tasks.everyone')}</MenuItem>
              <MenuItem value="unassigned">{t('crm.tasks.unassigned')}</MenuItem>
            </TextField>
            <TextField
              select
              label={t('crm.tasks.activity')}
              value={kind}
              onChange={(event) => setKind(event.target.value as TaskKind | 'all')}
              sx={{ minWidth: { sm: 190 } }}
            >
              <MenuItem value="all">{t('crm.tasks.allActivities')}</MenuItem>
              {(['task', 'call', 'email', 'meeting'] as TaskKind[]).map((item) => (
                <MenuItem key={item} value={item}>
                  {t(`crm.tasks.kind.${item}`)}
                </MenuItem>
              ))}
            </TextField>
            {activeFilterCount ? (
              <Button onClick={clearFilters}>{t('crm.tasks.clearFilters')}</Button>
            ) : null}
          </Stack>
        </Collapse>

        {layout === 'list' && view !== 'completed' && rows.length ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ px: { xs: 1.5, md: 2 }, py: 1.5, gap: 0.5, borderTop: 1, borderColor: 'divider' }}
          >
            <Typography component="h2" sx={{ fontWeight: 750 }}>
              {t('crm.tasks.queueTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('crm.tasks.queueSummary', { overdue: summary.overdue, today: summary.today })}
            </Typography>
          </Stack>
        ) : null}

        {content}
      </Paper>

      {detailsTask ? (
        <TaskDetailsDrawer
          task={tasks.data?.find((task) => task.id === detailsTask.id) ?? detailsTask}
          canManage={canManage}
          onClose={() => setDetailsTask(null)}
          onEdit={() => {
            setDrawer(detailsTask)
            setDetailsTask(null)
          }}
        />
      ) : null}

      {drawer && companies.data ? (
        <TaskDrawer
          organizationId={organization.id}
          companies={companies.data}
          task={drawer === true ? undefined : drawer}
          onClose={() => {
            setDrawer(null)
            if (routeSearch.create) void navigate({ search: { create: undefined } })
          }}
        />
      ) : null}
    </>
  )
}
