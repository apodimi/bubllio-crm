import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import AssignmentTurnedInRounded from '@mui/icons-material/AssignmentTurnedInRounded'
import BusinessRounded from '@mui/icons-material/BusinessRounded'
import HandshakeRounded from '@mui/icons-material/HandshakeRounded'
import NotesRounded from '@mui/icons-material/NotesRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import PersonRounded from '@mui/icons-material/PersonRounded'
import SubscriptionsRounded from '@mui/icons-material/SubscriptionsRounded'
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'

import { Failure } from '../../../components/common/Feedback'
import type { CompanyTimelineCategory, CompanyTimelineEvent } from '../../../types/company.types'
import { timelineNoteSchema, type TimelineNoteFormValues } from '../companySchema'
import { useAddCompanyTimelineNote, useCompanyTimeline } from '../hooks/useCompanies'

const filters: Array<{ value: 'all' | CompanyTimelineCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'note', label: 'Notes' },
  { value: 'task', label: 'Tasks' },
  { value: 'deal', label: 'Deals' },
  { value: 'contact', label: 'Contacts' },
  { value: 'service', label: 'Services' },
  { value: 'payment', label: 'Payments' },
]

function timelineIcon(category: CompanyTimelineCategory) {
  switch (category) {
    case 'contact':
      return <PersonRounded fontSize="small" />
    case 'deal':
      return <HandshakeRounded fontSize="small" />
    case 'task':
      return <AssignmentTurnedInRounded fontSize="small" />
    case 'service':
      return <SubscriptionsRounded fontSize="small" />
    case 'payment':
      return <PaymentsRounded fontSize="small" />
    case 'note':
      return <NotesRounded fontSize="small" />
    default:
      return <BusinessRounded fontSize="small" />
  }
}

function humanize(value?: string) {
  return value?.replaceAll('_', ' ') ?? ''
}

function eventCopy(event: CompanyTimelineEvent): { title: string; detail?: string } {
  const details = event.details
  switch (event.event_type) {
    case 'company.created':
      return { title: 'Company added' }
    case 'company.updated':
      return {
        title: 'Company details updated',
        detail: details.fields?.map(humanize).join(', '),
      }
    case 'company.assigned':
      return { title: 'Account owner changed' }
    case 'company.archived':
      return { title: 'Company archived' }
    case 'company.restored':
      return { title: 'Company restored' }
    case 'contact.created':
      return { title: `Contact added${details.contact_name ? `: ${details.contact_name}` : ''}` }
    case 'contact.updated':
      return { title: `Contact updated: ${details.contact_name ?? 'Contact'}` }
    case 'contact.assigned':
      return { title: `Contact owner changed: ${details.contact_name ?? 'Contact'}` }
    case 'contact.archived':
      return { title: `Contact archived: ${details.contact_name ?? 'Contact'}` }
    case 'contact.restored':
      return { title: `Contact restored: ${details.contact_name ?? 'Contact'}` }
    case 'deal.created':
      return { title: `Deal added: ${details.deal_title ?? 'Deal'}` }
    case 'deal.updated':
      return { title: `Deal updated: ${details.deal_title ?? 'Deal'}` }
    case 'deal.stage_changed':
      return {
        title: `Deal moved: ${details.deal_title ?? 'Deal'}`,
        detail: `${humanize(details.from_stage)} → ${humanize(details.to_stage)}`,
      }
    case 'deal.archived':
      return { title: `Deal archived: ${details.deal_title ?? 'Deal'}` }
    case 'deal.restored':
      return { title: `Deal restored: ${details.deal_title ?? 'Deal'}` }
    case 'task.created':
      return { title: `Task added: ${details.task_title ?? 'Task'}` }
    case 'task.updated':
      return { title: `Task updated: ${details.task_title ?? 'Task'}` }
    case 'task.completed':
      return { title: `Task completed: ${details.task_title ?? 'Task'}` }
    case 'task.reopened':
      return { title: `Task reopened: ${details.task_title ?? 'Task'}` }
    case 'task.status_changed':
      return {
        title: `Task status changed: ${details.task_title ?? 'Task'}`,
        detail: `${humanize(details.from_status)} → ${humanize(details.to_status)}`,
      }
    case 'service.created':
      return { title: `Service started: ${details.subscription_name ?? 'Customer service'}` }
    case 'service.updated':
      return { title: `Service updated: ${details.subscription_name ?? 'Customer service'}` }
    case 'service.status_changed':
      return {
        title: `Service status changed: ${details.subscription_name ?? 'Customer service'}`,
        detail: humanize(details.to_status),
      }
    case 'payment.recorded': {
      const amount = Number(details.amount)
      const formatted = Number.isFinite(amount)
        ? amount.toLocaleString(undefined, {
            style: 'currency',
            currency: details.currency ?? 'EUR',
          })
        : details.amount
      return {
        title: `Payment recorded${formatted ? `: ${formatted}` : ''}`,
        detail: details.subscription_name,
      }
    }
    case 'note.added':
      return { title: 'Note added' }
    default:
      return { title: humanize(event.event_type) }
  }
}

function TimelineLoading() {
  return (
    <Stack divider={<Divider />}>
      {[0, 1, 2].map((item) => (
        <Stack key={item} direction="row" spacing={2} sx={{ px: 3, py: 2.25 }}>
          <Skeleton variant="rounded" width={36} height={36} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="42%" />
            <Skeleton width="24%" />
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

export function CompanyTimeline({
  organizationId,
  companyId,
  canManage,
}: {
  organizationId: string
  companyId: string
  canManage: boolean
}) {
  const [category, setCategory] = useState<CompanyTimelineCategory | undefined>()
  const timeline = useCompanyTimeline(organizationId, companyId, category)
  const addNote = useAddCompanyTimelineNote(organizationId, companyId)
  const form = useForm<TimelineNoteFormValues>({
    resolver: zodResolver(timelineNoteSchema),
    defaultValues: { body: '' },
  })
  const events = timeline.data?.pages.flatMap((page) => page.results) ?? []

  async function submitNote(values: TimelineNoteFormValues) {
    await addNote.mutateAsync(values.body)
    form.reset()
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', gridColumn: { lg: '1 / -1' } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          px: 3,
          py: 2.5,
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6">Customer timeline</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Notes, relationship changes, follow-ups, deals, services, and payments
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: '100%' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={category ?? 'all'}
            aria-label="Filter customer timeline"
            onChange={(_, value: 'all' | CompanyTimelineCategory | null) => {
              if (value) setCategory(value === 'all' ? undefined : value)
            }}
          >
            {filters.map((filter) => (
              <ToggleButton key={filter.value} value={filter.value} sx={{ whiteSpace: 'nowrap' }}>
                {filter.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <TextField
          select
          size="small"
          label="Timeline filter"
          value={category ?? 'all'}
          onChange={(event) => {
            const value = event.target.value as 'all' | CompanyTimelineCategory
            setCategory(value === 'all' ? undefined : value)
          }}
          sx={{ display: { xs: 'flex', sm: 'none' } }}
        >
          {filters.map((filter) => (
            <MenuItem key={filter.value} value={filter.value}>
              {filter.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {canManage ? (
        <Box
          component="form"
          onSubmit={form.handleSubmit(submitNote)}
          sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider', px: 3, py: 2.5 }}
        >
          <Controller
            name="body"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                minRows={2}
                label="Add a note"
                placeholder="Record a decision, conversation, or customer context…"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? 'Visible to everyone in this workspace.'}
                disabled={addNote.isPending}
              />
            )}
          />
          {addNote.isError ? (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {addNote.error.message}
            </Alert>
          ) : null}
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
            <Button type="submit" variant="contained" disabled={addNote.isPending}>
              {addNote.isPending ? 'Adding…' : 'Add note'}
            </Button>
          </Stack>
        </Box>
      ) : null}

      {timeline.isPending ? <TimelineLoading /> : null}
      {timeline.isError ? (
        <Box sx={{ p: 3 }}>
          <Failure error={timeline.error} retry={() => void timeline.refetch()} />
        </Box>
      ) : null}
      {timeline.isSuccess && events.length === 0 ? (
        <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>No timeline entries yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {category
              ? 'Choose another filter to see the rest of this customer’s history.'
              : 'New notes and CRM activity will appear here in chronological order.'}
          </Typography>
        </Box>
      ) : null}
      {timeline.isSuccess && events.length > 0 ? (
        <Stack divider={<Divider />}>
          {events.map((event) => {
            const copy = eventCopy(event)
            return (
              <Box
                key={event.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '36px minmax(0, 1fr)',
                    sm: '36px minmax(0, 1fr) 184px',
                  },
                  columnGap: 2,
                  px: 3,
                  py: 2.25,
                  alignItems: 'start',
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 36,
                    height: 36,
                    display: 'grid',
                    placeItems: 'center',
                    flex: '0 0 auto',
                    borderRadius: 1,
                    bgcolor: 'action.selected',
                    color: 'primary.main',
                  }}
                >
                  {timelineIcon(event.category)}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {copy.title}
                  </Typography>
                  {event.body ? (
                    <Typography sx={{ mt: 0.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {event.body}
                    </Typography>
                  ) : null}
                  {copy.detail ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {copy.detail}
                    </Typography>
                  ) : null}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.75 }}
                  >
                    {event.actor_name}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    gridColumn: { xs: '2', sm: '3' },
                    mt: { xs: 0.25, sm: 0.15 },
                    textAlign: { sm: 'right' },
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(event.occurred_at))}
                </Typography>
              </Box>
            )
          })}
          {timeline.hasNextPage ? (
            <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
              <Button
                onClick={() => void timeline.fetchNextPage()}
                disabled={timeline.isFetchingNextPage}
              >
                {timeline.isFetchingNextPage ? 'Loading…' : 'Load earlier activity'}
              </Button>
            </Box>
          ) : null}
        </Stack>
      ) : null}
    </Paper>
  )
}
