import { useState } from 'react'
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import EventOutlined from '@mui/icons-material/EventOutlined'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { alpha } from '@mui/material/styles'
import {
  Avatar,
  Box,
  ButtonBase,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type { CrmTask, TaskWorkflowStatus } from '../../../types/task.types'

const lanes: Array<{ value: TaskWorkflowStatus; label: string; accent: string }> = [
  { value: 'todo', label: 'To do', accent: '#68758a' },
  { value: 'in_progress', label: 'In progress', accent: '#2563eb' },
  { value: 'waiting', label: 'Waiting', accent: '#d97706' },
  { value: 'completed', label: 'Completed', accent: '#16845b' },
]

const dueLabel = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

function TaskCardSurface({
  task,
  onEdit,
  dragHandle,
  preview = false,
}: {
  task: CrmTask
  onEdit?: () => void
  dragHandle?: React.ReactNode
  preview?: boolean
}) {
  const initials =
    task.assigned_to_name
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—'
  return (
    <Paper
      elevation={preview ? 4 : 0}
      onClick={onEdit}
      sx={{
        p: 2,
        borderRadius: '14px',
        border: '1px solid',
        borderColor: preview ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: preview ? undefined : '0 3px 12px rgba(15,31,56,.05)',
        cursor: onEdit ? 'pointer' : 'grabbing',
        transition:
          'border-color 140ms ease-out, box-shadow 140ms ease-out, transform 140ms ease-out',
        '&:hover': preview
          ? undefined
          : {
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.32),
              boxShadow: '0 9px 24px rgba(15,31,56,.09)',
              transform: 'translateY(-1px)',
            },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 750, lineHeight: 1.35 }}>{task.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {task.company_name}
            {task.deal_title ? ` · ${task.deal_title}` : ''}
          </Typography>
        </Box>
        {dragHandle}
      </Stack>
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{ mt: 1.75, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Chip size="small" label={task.kind} variant="outlined" />
        {task.priority !== 'normal' ? (
          <Chip
            size="small"
            label={task.priority}
            color={task.priority === 'urgent' ? 'error' : 'warning'}
            variant="outlined"
          />
        ) : null}
      </Stack>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          mt: 1.5,
          alignItems: 'center',
          color: task.effective_status === 'overdue' ? 'error.main' : 'text.secondary',
        }}
      >
        <EventOutlined sx={{ fontSize: 16 }} />
        <Typography
          variant="caption"
          sx={{ flex: 1, fontWeight: task.effective_status === 'overdue' ? 700 : 500 }}
        >
          {dueLabel(task.due_at)}
        </Typography>
        <Tooltip title={task.assigned_to_name || 'Unassigned'}>
          <Avatar
            sx={{
              width: 26,
              height: 26,
              fontSize: 10,
              fontWeight: 800,
              bgcolor: 'primary.light',
              color: 'primary.dark',
            }}
          >
            {initials}
          </Avatar>
        </Tooltip>
      </Stack>
      {!preview && onEdit ? (
        <ButtonBase
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          sx={{
            mt: 1.5,
            borderRadius: 1,
            color: 'primary.main',
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'action.focus',
              outlineOffset: 2,
            },
          }}
        >
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <EditOutlined sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Open and edit
            </Typography>
          </Stack>
        </ButtonBase>
      ) : null}
    </Paper>
  )
}

function TaskCard({
  task,
  canManage,
  onEdit,
}: {
  task: CrmTask
  canManage: boolean
  onEdit: () => void
}) {
  const sortable = useSortable({
    id: task.id,
    data: { task, workflowStatus: task.workflow_status },
    disabled: !canManage,
  })
  return (
    <Box
      ref={sortable.setNodeRef}
      sx={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.2 : 1,
      }}
    >
      <TaskCardSurface
        task={task}
        onEdit={canManage ? onEdit : undefined}
        dragHandle={
          canManage ? (
            <Tooltip title="Drag to move">
              <IconButton
                size="small"
                aria-label={`Move ${task.title}`}
                onClick={(event) => event.stopPropagation()}
                {...sortable.attributes}
                {...sortable.listeners}
                sx={{
                  width: 30,
                  height: 30,
                  bgcolor: 'action.hover',
                  color: 'text.secondary',
                  cursor: sortable.isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
              >
                <DragIndicatorRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : undefined
        }
      />
    </Box>
  )
}

function TaskLane({
  status,
  label,
  accent,
  tasks,
  canManage,
  onEdit,
}: {
  status: TaskWorkflowStatus
  label: string
  accent: string
  tasks: CrmTask[]
  canManage: boolean
  onEdit: (task: CrmTask) => void
}) {
  const drop = useDroppable({
    id: `task-status:${status}`,
    data: { workflowStatus: status },
    disabled: !canManage,
  })
  return (
    <Box
      ref={drop.setNodeRef}
      sx={{
        p: 1.5,
        minHeight: 420,
        borderRadius: '16px',
        bgcolor: (theme) => alpha(theme.palette.primary.main, drop.isOver ? 0.075 : 0.025),
        outline: '1px solid',
        outlineColor: drop.isOver ? (theme) => alpha(theme.palette.primary.main, 0.45) : 'divider',
        outlineOffset: -1,
        transition: 'background-color 140ms ease-out, outline-color 140ms ease-out',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ px: 0.5, pt: 0.25, pb: 1.75, alignItems: 'center' }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: accent,
            boxShadow: `0 0 0 4px ${alpha(accent, 0.12)}`,
          }}
        />
        <Typography sx={{ fontWeight: 800, flex: 1 }}>{label}</Typography>
        <Box
          sx={{
            minWidth: 24,
            height: 24,
            px: 0.75,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.paper',
            color: 'text.secondary',
            fontSize: 12,
            fontWeight: 750,
          }}
        >
          {tasks.length}
        </Box>
      </Stack>
      <SortableContext items={tasks.map((task) => task.id)}>
        <Stack spacing={1.25}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} canManage={canManage} onEdit={() => onEdit(task)} />
          ))}
          {tasks.length === 0 ? (
            <Box
              sx={{
                minHeight: 104,
                border: '1px dashed',
                borderColor: drop.isOver ? 'primary.main' : 'divider',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                color: drop.isOver ? 'primary.main' : 'text.secondary',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 650 }}>
                {drop.isOver ? `Move to ${label}` : 'No tasks here'}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </SortableContext>
    </Box>
  )
}

export function TaskBoard({
  tasks,
  canManage,
  moving,
  onMove,
  onEdit,
}: {
  tasks: CrmTask[]
  canManage: boolean
  moving: boolean
  onMove: (task: CrmTask, status: TaskWorkflowStatus) => void
  onEdit: (task: CrmTask) => void
}) {
  const [activeTask, setActiveTask] = useState<CrmTask | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const dragStart = (event: DragStartEvent) =>
    setActiveTask((event.active.data.current?.task as CrmTask | undefined) ?? null)
  const dragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const task = event.active.data.current?.task as CrmTask | undefined
    const status = (event.over?.data.current?.workflowStatus ??
      event.over?.data.current?.task?.workflow_status) as TaskWorkflowStatus | undefined
    if (task && status && status !== task.workflow_status && !moving) onMove(task, status)
  }
  return (
    <DndContext
      sensors={canManage ? sensors : []}
      collisionDetection={closestCorners}
      onDragStart={dragStart}
      onDragCancel={() => setActiveTask(null)}
      onDragEnd={dragEnd}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(4,minmax(280px,1fr))',
            lg: 'repeat(4,minmax(250px,1fr))',
          },
          gap: 2,
          overflowX: 'auto',
          pb: 2,
        }}
      >
        {lanes.map((lane) => (
          <TaskLane
            key={lane.value}
            status={lane.value}
            label={lane.label}
            accent={lane.accent}
            tasks={tasks.filter((task) => task.workflow_status === lane.value)}
            canManage={canManage && !moving}
            onEdit={onEdit}
          />
        ))}
      </Box>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
        {activeTask ? (
          <Box sx={{ width: 280, transform: 'rotate(1.5deg)' }}>
            <TaskCardSurface task={activeTask} preview />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
