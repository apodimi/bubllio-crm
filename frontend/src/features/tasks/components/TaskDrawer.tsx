import { zodResolver } from '@hookform/resolvers/zod'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useAuthStore } from '../../auth'
import { useCompanyAssignees } from '../../companies'
import { useContacts } from '../../contacts'
import { useDeals } from '../../deals'
import type { Company } from '../../../types/company.types'
import type { CrmTask, TaskInput } from '../../../types/task.types'
import { taskSchema } from '../taskSchema'
import type { TaskFormValues } from '../taskSchema'
import { useCreateTask, useDeleteTask, useMoveTask, useUpdateTask } from '../hooks/useTasks'

const toLocalInput = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const tomorrowMorning = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return toLocalInput(date.toISOString())
}

const taskValues = (task: CrmTask | undefined, currentUserId: number | null): TaskFormValues => ({
  company: task?.company ?? '',
  contact: task?.contact ?? null,
  deal: task?.deal ?? null,
  assigned_to: task?.assigned_to ?? currentUserId,
  title: task?.title ?? '',
  kind: task?.kind ?? 'task',
  priority: task?.priority ?? 'normal',
  workflow_status: task?.workflow_status ?? 'todo',
  due_at: toLocalInput(task?.due_at ?? null) || tomorrowMorning(),
  reminder_at: toLocalInput(task?.reminder_at ?? null) || null,
  notes: task?.notes ?? '',
})

export function TaskDrawer({
  organizationId,
  companies,
  task,
  onClose,
}: {
  organizationId: string
  companies: Company[]
  task?: CrmTask
  onClose: () => void
}) {
  const create = useCreateTask(organizationId)
  const update = useUpdateTask(organizationId, task?.id ?? '')
  const remove = useDeleteTask(organizationId)
  const move = useMoveTask(organizationId)
  const mutation = task ? update : create
  const contacts = useContacts(organizationId, { archived: 'active' })
  const deals = useDeals(organizationId)
  const assignees = useCompanyAssignees(organizationId)
  const currentUser = useAuthStore((state) => state.user)
  const currentUserId = currentUser?.id ?? null
  const ownerOptions =
    assignees.data ?? (currentUser ? [{ id: currentUser.id, name: currentUser.username }] : [])
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: taskValues(task, currentUserId),
  })
  const companyId = useWatch({ control, name: 'company' })
  const companyContacts = (contacts.data ?? []).filter((contact) => contact.company === companyId)
  const companyDeals = (deals.data ?? []).filter((deal) => deal.company === companyId)
  const pending = mutation.isPending || remove.isPending || move.isPending
  const error = mutation.error || remove.error || move.error

  async function submit(values: TaskFormValues) {
    const { workflow_status, ...editableValues } = values
    const body: TaskInput = {
      ...editableValues,
      due_at: new Date(values.due_at).toISOString(),
      reminder_at: values.reminder_at ? new Date(values.reminder_at).toISOString() : null,
    }
    try {
      await mutation.mutateAsync(body)
      if (task && workflow_status !== task.workflow_status) {
        await move.mutateAsync({ taskId: task.id, workflowStatus: workflow_status })
      }
      onClose()
    } catch {
      /* Normalized API error is rendered below. */
    }
  }

  async function deleteTask() {
    if (!task || !window.confirm('Delete this task permanently?')) return
    try {
      await remove.mutateAsync(task.id)
      onClose()
    } catch {
      /* Normalized API error is rendered below. */
    }
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={pending ? undefined : onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 600 },
          maxWidth: '100vw',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => void handleSubmit(submit)(event)}
        sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Stack
          direction="row"
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h5">{task ? 'Edit task' : 'Add next action'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Keep the owner, customer and next commitment clear.
            </Typography>
          </Box>
          <IconButton aria-label="Close task form" onClick={onClose} disabled={pending}>
            <CloseRounded />
          </IconButton>
        </Stack>
        <Stack spacing={2.5} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 4 }}>
          {error ? <Alert severity="error">{error.message}</Alert> : null}
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                required
                autoFocus
                label="What needs to happen?"
                error={Boolean(errors.title)}
                helperText={errors.title?.message}
                disabled={pending}
              />
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Activity" disabled={pending} sx={{ flex: 1 }}>
                  <MenuItem value="task">Task</MenuItem>
                  <MenuItem value="call">Call</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="meeting">Meeting</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Priority" disabled={pending} sx={{ flex: 1 }}>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </TextField>
              )}
            />
          </Stack>
          <Controller
            name="company"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                required
                label="Company"
                error={Boolean(errors.company)}
                helperText={errors.company?.message}
                disabled={pending}
                onChange={(event) => {
                  field.onChange(event)
                  setValue('contact', null)
                  setValue('deal', null)
                }}
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="contact"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Contact"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value || null)}
                  disabled={!companyId || pending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">No contact</MenuItem>
                  {companyContacts.map((contact) => (
                    <MenuItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="deal"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Deal"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value || null)}
                  disabled={!companyId || pending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">No deal</MenuItem>
                  {companyDeals.map((deal) => (
                    <MenuItem key={deal.id} value={deal.id}>
                      {deal.title}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
          <Controller
            name="assigned_to"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Owner"
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(event.target.value ? Number(event.target.value) : null)
                }
                disabled={pending}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {ownerOptions.map((person) => (
                  <MenuItem key={person.id} value={person.id}>
                    {person.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {task ? (
            <Controller
              name="workflow_status"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Status" disabled={pending}>
                  <MenuItem value="todo">To do</MenuItem>
                  <MenuItem value="in_progress">In progress</MenuItem>
                  <MenuItem value="waiting">Waiting</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </TextField>
              )}
            />
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="due_at"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  required
                  type="datetime-local"
                  label="Due"
                  error={Boolean(errors.due_at)}
                  helperText={errors.due_at?.message}
                  disabled={pending}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ flex: 1 }}
                />
              )}
            />
            <Controller
              name="reminder_at"
              control={control}
              render={({ field }) => (
                <TextField
                  type="datetime-local"
                  label="Reminder"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value || null)}
                  error={Boolean(errors.reminder_at)}
                  helperText={errors.reminder_at?.message ?? 'Shown in CRM; alerts come later.'}
                  disabled={pending}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ flex: 1 }}
                />
              )}
            />
          </Stack>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                multiline
                minRows={4}
                label="Notes"
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message}
                disabled={pending}
              />
            )}
          />
        </Stack>
        <Stack
          direction="row"
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {task ? (
            <Button
              color="error"
              startIcon={<DeleteOutlineRounded />}
              onClick={() => void deleteTask()}
              disabled={pending}
            >
              Delete
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} disabled={pending} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Saving…' : task ? 'Save changes' : 'Add task'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
