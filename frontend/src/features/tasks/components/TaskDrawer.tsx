import { zodResolver } from '@hookform/resolvers/zod'
import deleteIcon from '@iconify-icons/keyline-icons/delete'
import xIcon from '@iconify-icons/keyline-icons/x'
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
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import { useAuthStore } from '../../auth'
import { useCompanyAssignees } from '../../companies'
import { useContacts } from '../../contacts'
import { useDeals } from '../../deals'
import type { Company } from '../../../types/company.types'
import type { CrmTask, TaskInput } from '../../../types/task.types'
import { taskSchema } from '../taskSchema'
import type { TaskFormValues } from '../taskSchema'
import { useCreateTask, useDeleteTask, useUpdateTask } from '../hooks/useTasks'

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

const taskValues = (
  task: CrmTask | undefined,
  currentUserId: number | null,
  initialCompanyId?: string,
  initialContactId?: string,
  initialDealId?: string,
): TaskFormValues => ({
  company: task?.company ?? initialCompanyId ?? '',
  contact: task?.contact ?? initialContactId ?? null,
  deal: task?.deal ?? initialDealId ?? null,
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
  initialCompanyId,
  initialContactId,
  initialDealId,
  initialDealTitle,
  onSaved,
  onClose,
}: {
  organizationId: string
  companies: Company[]
  task?: CrmTask
  initialCompanyId?: string
  initialContactId?: string
  initialDealId?: string
  initialDealTitle?: string
  onSaved?: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateTask(organizationId)
  const update = useUpdateTask(organizationId, task?.id ?? '')
  const remove = useDeleteTask(organizationId)
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
    defaultValues: taskValues(
      task,
      currentUserId,
      initialCompanyId,
      initialContactId,
      initialDealId,
    ),
  })
  const companyId = useWatch({ control, name: 'company' })
  const companyContacts = (contacts.data ?? []).filter((contact) => contact.company === companyId)
  const companyDeals = (deals.data ?? []).filter((deal) => deal.company === companyId)
  const selectedDealId = useWatch({ control, name: 'deal' })
  const selectedDealAvailable =
    !selectedDealId || companyDeals.some((deal) => deal.id === selectedDealId)
  const pending = mutation.isPending || remove.isPending
  const error = mutation.error || remove.error
  const validationMessages: Record<string, string> = {
    'Choose a company.': t('crm.tasks.drawer.validation.company'),
    'Task title is required.': t('crm.tasks.drawer.validation.title'),
    'Due date and time are required.': t('crm.tasks.drawer.validation.due'),
    'Use at most 5,000 characters.': t('crm.tasks.drawer.validation.notesLength'),
    'The reminder must be before the due time.': t('crm.tasks.drawer.validation.reminderBeforeDue'),
  }
  const validationMessage = (message?: string) =>
    message ? (validationMessages[message] ?? t('crm.tasks.drawer.validation.invalid')) : undefined
  let submitLabel = t('crm.tasks.drawer.addTask')
  if (pending) {
    submitLabel = t('crm.tasks.drawer.saving')
  } else if (task) {
    submitLabel = t('crm.tasks.drawer.saveChanges')
  }

  async function submit(values: TaskFormValues) {
    const { workflow_status, ...editableValues } = values
    const body: TaskInput = {
      ...editableValues,
      due_at: new Date(values.due_at).toISOString(),
      reminder_at: values.reminder_at ? new Date(values.reminder_at).toISOString() : null,
    }
    try {
      await mutation.mutateAsync(task ? { ...body, workflow_status } : body)
      onSaved?.()
      onClose()
    } catch {
      /* Normalized API error is rendered below. */
    }
  }

  async function deleteTask() {
    if (!task || !window.confirm(t('crm.tasks.drawer.deleteConfirmation'))) return
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
            <Typography variant="h5">
              {task ? t('crm.tasks.drawer.editTitle') : t('crm.tasks.drawer.createTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('crm.tasks.drawer.subtitle')}
            </Typography>
          </Box>
          <IconButton aria-label={t('crm.tasks.drawer.close')} onClick={onClose} disabled={pending}>
            <AppIcon icon={xIcon} />
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
                label={t('crm.tasks.drawer.titleLabel')}
                error={Boolean(errors.title)}
                helperText={validationMessage(errors.title?.message)}
                disabled={pending}
              />
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={t('crm.tasks.activity')}
                  disabled={pending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="task">{t('crm.tasks.kind.task')}</MenuItem>
                  <MenuItem value="call">{t('crm.tasks.kind.call')}</MenuItem>
                  <MenuItem value="email">{t('crm.tasks.kind.email')}</MenuItem>
                  <MenuItem value="meeting">{t('crm.tasks.kind.meeting')}</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={t('crm.tasks.details.priority')}
                  disabled={pending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="low">{t('crm.tasks.drawer.priority.low')}</MenuItem>
                  <MenuItem value="normal">{t('crm.tasks.drawer.priority.normal')}</MenuItem>
                  <MenuItem value="high">{t('crm.tasks.drawer.priority.high')}</MenuItem>
                  <MenuItem value="urgent">{t('crm.tasks.drawer.priority.urgent')}</MenuItem>
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
                label={t('crm.tasks.details.company')}
                error={Boolean(errors.company)}
                helperText={validationMessage(errors.company?.message)}
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
                  label={t('crm.tasks.details.contact')}
                  value={
                    companyContacts.some((contact) => contact.id === field.value) ? field.value : ''
                  }
                  onChange={(event) => field.onChange(event.target.value || null)}
                  disabled={!companyId || pending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">{t('crm.tasks.drawer.noContact')}</MenuItem>
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
                  label={t('crm.tasks.details.deal')}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value || null)}
                  disabled={!companyId || pending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">{t('crm.tasks.drawer.noDeal')}</MenuItem>
                  {!selectedDealAvailable && selectedDealId ? (
                    <MenuItem value={selectedDealId}>
                      {task?.deal_title || initialDealTitle || selectedDealId}
                    </MenuItem>
                  ) : null}
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
                label={t('crm.tasks.details.owner')}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(event.target.value ? Number(event.target.value) : null)
                }
                disabled={pending}
              >
                <MenuItem value="">{t('crm.tasks.unassigned')}</MenuItem>
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
                <TextField
                  {...field}
                  select
                  label={t('crm.tasks.details.status')}
                  disabled={pending}
                >
                  <MenuItem value="todo">{t('crm.tasks.status.todo')}</MenuItem>
                  <MenuItem value="in_progress">{t('crm.tasks.status.in_progress')}</MenuItem>
                  <MenuItem value="waiting">{t('crm.tasks.status.waiting')}</MenuItem>
                  <MenuItem value="completed">{t('crm.tasks.status.completed')}</MenuItem>
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
                  label={t('crm.tasks.details.due')}
                  error={Boolean(errors.due_at)}
                  helperText={validationMessage(errors.due_at?.message)}
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
                  label={t('crm.tasks.details.reminder')}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value || null)}
                  error={Boolean(errors.reminder_at)}
                  helperText={
                    validationMessage(errors.reminder_at?.message) ??
                    t('crm.tasks.drawer.reminderHint')
                  }
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
                label={t('crm.tasks.details.notes')}
                error={Boolean(errors.notes)}
                helperText={validationMessage(errors.notes?.message)}
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
              startIcon={<AppIcon icon={deleteIcon} />}
              onClick={() => void deleteTask()}
              disabled={pending}
            >
              {t('crm.tasks.drawer.delete')}
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} disabled={pending} sx={{ mr: 1 }}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {submitLabel}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
