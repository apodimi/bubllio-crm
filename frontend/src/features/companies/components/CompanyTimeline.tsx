import { zodResolver } from '@hookform/resolvers/zod'
import AssignmentTurnedInRounded from '@mui/icons-material/AssignmentTurnedInRounded'
import AddTaskRounded from '@mui/icons-material/AddTaskRounded'
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
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type { TFunction } from 'i18next'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Failure } from '../../../components/common/Feedback'
import { TaskDrawer } from '../../tasks/components/TaskDrawer'
import type {
  Company,
  CompanyTimelineCategory,
  CompanyTimelineEvent,
} from '../../../types/company.types'
import { timelineNoteSchema, type TimelineNoteFormValues } from '../companySchema'
import { useAddCompanyTimelineNote, useCompanyTimeline } from '../hooks/useCompanies'
import { CompanyTimelineLoading } from './CompanyTimelineLoading'

const filters: Array<'all' | CompanyTimelineCategory> = [
  'all',
  'company',
  'note',
  'task',
  'deal',
  'contact',
  'service',
  'payment',
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

function translatedValue(value: string | undefined, t: TFunction) {
  const normalized = value ?? ''
  const knownValues: Record<string, string> = {
    lead: t('crm.companies.timeline.values.lead'),
    qualified: t('crm.companies.timeline.values.qualified'),
    proposal: t('crm.companies.timeline.values.proposal'),
    negotiation: t('crm.companies.timeline.values.negotiation'),
    won: t('crm.companies.timeline.values.won'),
    lost: t('crm.companies.timeline.values.lost'),
    todo: t('crm.companies.timeline.values.todo'),
    in_progress: t('crm.companies.timeline.values.inProgress'),
    waiting: t('crm.companies.timeline.values.waiting'),
    completed: t('crm.companies.timeline.values.completed'),
    active: t('crm.companies.timeline.values.active'),
    paused: t('crm.companies.timeline.values.paused'),
    cancelling: t('crm.companies.timeline.values.cancelling'),
    cancelled: t('crm.companies.timeline.values.cancelled'),
    expired: t('crm.companies.timeline.values.expired'),
  }
  return knownValues[normalized] ?? humanize(normalized)
}

function translatedField(value: string, t: TFunction) {
  const knownFields: Record<string, string> = {
    name: t('crm.companies.form.name'),
    tax_id: t('crm.companies.profileContent.taxId'),
    industry: t('crm.companies.profileContent.industry'),
    email: t('crm.companies.profileContent.email'),
    phone_number: t('crm.companies.profileContent.phone'),
    website: t('crm.companies.profileContent.website'),
    address_line_1: t('crm.companies.profileContent.address'),
    address_line_2: t('crm.companies.form.addressLine2'),
    city: t('crm.companies.form.city'),
    postal_code: t('crm.companies.form.postalCode'),
    country: t('crm.companies.form.country'),
    notes: t('crm.companies.profileContent.internalNotes'),
    lifecycle_stage: t('crm.companies.form.stage'),
    assigned_to: t('crm.companies.profileContent.accountOwner'),
  }
  return knownFields[value] ?? humanize(value)
}

function eventCopy(
  event: CompanyTimelineEvent,
  t: TFunction,
  locale: string,
): { title: string; detail?: string } {
  const details = event.details
  switch (event.event_type) {
    case 'company.created':
      return { title: t('crm.companies.timeline.events.companyAdded') }
    case 'company.updated':
      return {
        title: t('crm.companies.timeline.events.companyUpdated'),
        detail: details.fields?.map((field) => translatedField(field, t)).join(', '),
      }
    case 'company.assigned':
      return { title: t('crm.companies.timeline.events.ownerChanged') }
    case 'company.archived':
      return { title: t('crm.companies.timeline.events.companyArchived') }
    case 'company.restored':
      return { title: t('crm.companies.timeline.events.companyRestored') }
    case 'contact.created':
      return {
        title: t('crm.companies.timeline.events.contactAdded', {
          name: details.contact_name ?? t('crm.companies.detail.contactFallback'),
        }),
      }
    case 'contact.updated':
      return {
        title: t('crm.companies.timeline.events.contactUpdated', {
          name: details.contact_name ?? t('crm.companies.detail.contactFallback'),
        }),
      }
    case 'contact.assigned':
      return {
        title: t('crm.companies.timeline.events.contactOwnerChanged', {
          name: details.contact_name ?? t('crm.companies.detail.contactFallback'),
        }),
      }
    case 'contact.archived':
      return {
        title: t('crm.companies.timeline.events.contactArchived', {
          name: details.contact_name ?? t('crm.companies.detail.contactFallback'),
        }),
      }
    case 'contact.restored':
      return {
        title: t('crm.companies.timeline.events.contactRestored', {
          name: details.contact_name ?? t('crm.companies.detail.contactFallback'),
        }),
      }
    case 'deal.created':
      return {
        title: t('crm.companies.timeline.events.dealAdded', {
          name: details.deal_title ?? t('crm.companies.timeline.dealFallback'),
        }),
      }
    case 'deal.updated':
      return {
        title: t('crm.companies.timeline.events.dealUpdated', {
          name: details.deal_title ?? t('crm.companies.timeline.dealFallback'),
        }),
      }
    case 'deal.stage_changed':
      return {
        title: t('crm.companies.timeline.events.dealMoved', {
          name: details.deal_title ?? t('crm.companies.timeline.dealFallback'),
        }),
        detail: t('crm.companies.timeline.transition', {
          from: translatedValue(details.from_stage, t),
          to: translatedValue(details.to_stage, t),
        }),
      }
    case 'deal.archived':
      return {
        title: t('crm.companies.timeline.events.dealArchived', {
          name: details.deal_title ?? t('crm.companies.timeline.dealFallback'),
        }),
      }
    case 'deal.restored':
      return {
        title: t('crm.companies.timeline.events.dealRestored', {
          name: details.deal_title ?? t('crm.companies.timeline.dealFallback'),
        }),
      }
    case 'task.created':
      return {
        title: t('crm.companies.timeline.events.taskAdded', {
          name: details.task_title ?? t('crm.companies.timeline.taskFallback'),
        }),
      }
    case 'task.updated':
      return {
        title: t('crm.companies.timeline.events.taskUpdated', {
          name: details.task_title ?? t('crm.companies.timeline.taskFallback'),
        }),
      }
    case 'task.completed':
      return {
        title: t('crm.companies.timeline.events.taskCompleted', {
          name: details.task_title ?? t('crm.companies.timeline.taskFallback'),
        }),
      }
    case 'task.reopened':
      return {
        title: t('crm.companies.timeline.events.taskReopened', {
          name: details.task_title ?? t('crm.companies.timeline.taskFallback'),
        }),
      }
    case 'task.status_changed':
      return {
        title: t('crm.companies.timeline.events.taskStatusChanged', {
          name: details.task_title ?? t('crm.companies.timeline.taskFallback'),
        }),
        detail: t('crm.companies.timeline.transition', {
          from: translatedValue(details.from_status, t),
          to: translatedValue(details.to_status, t),
        }),
      }
    case 'service.created':
      return {
        title: t('crm.companies.timeline.events.serviceStarted', {
          name: details.subscription_name ?? t('crm.companies.timeline.serviceFallback'),
        }),
      }
    case 'service.updated':
      return {
        title: t('crm.companies.timeline.events.serviceUpdated', {
          name: details.subscription_name ?? t('crm.companies.timeline.serviceFallback'),
        }),
      }
    case 'service.status_changed':
      return {
        title: t('crm.companies.timeline.events.serviceStatusChanged', {
          name: details.subscription_name ?? t('crm.companies.timeline.serviceFallback'),
        }),
        detail: translatedValue(details.to_status, t),
      }
    case 'payment.recorded': {
      const amount = Number(details.amount)
      const formatted = Number.isFinite(amount)
        ? amount.toLocaleString(locale, {
            style: 'currency',
            currency: details.currency ?? 'EUR',
          })
        : details.amount
      return {
        title: formatted
          ? t('crm.companies.timeline.events.paymentRecorded', { amount: formatted })
          : t('crm.companies.timeline.events.paymentRecordedNoAmount'),
        detail: details.subscription_name,
      }
    }
    case 'note.added':
      return { title: t('crm.companies.timeline.events.noteAdded') }
    default:
      return {
        title: t('crm.companies.timeline.events.unknown'),
      }
  }
}

function dayKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function dayLabel(value: string, locale: string, t: TFunction) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(value) === dayKey(today.toISOString())) {
    return t('crm.companies.timeline.today')
  }
  if (dayKey(value) === dayKey(yesterday.toISOString())) {
    return t('crm.companies.timeline.yesterday')
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
}

function relativeTime(value: string, locale: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (Math.abs(seconds) < 60) {
    return formatter.format(seconds, 'second')
  }
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute')
  }
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour')
  }
  return formatter.format(Math.round(hours / 24), 'day')
}

export function CompanyTimeline({
  organizationId,
  company,
  canManage,
}: {
  organizationId: string
  company: Company
  canManage: boolean
}) {
  const { t, i18n } = useTranslation()
  const companyId = company.id
  const [category, setCategory] = useState<CompanyTimelineCategory | undefined>()
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const timeline = useCompanyTimeline(organizationId, companyId, category)
  const addNote = useAddCompanyTimelineNote(organizationId, companyId)
  const [noteAdded, setNoteAdded] = useState(false)
  const form = useForm<TimelineNoteFormValues>({
    resolver: zodResolver(timelineNoteSchema),
    defaultValues: { body: '' },
  })
  const events = timeline.data?.pages.flatMap((page) => page.results) ?? []
  const locale = i18n.resolvedLanguage ?? i18n.language
  const groupedEvents = events.reduce<
    Array<{ key: string; label: string; events: CompanyTimelineEvent[] }>
  >((groups, event) => {
    const key = dayKey(event.occurred_at)
    const current = groups.at(-1)
    if (current?.key === key) {
      current.events.push(event)
    } else {
      groups.push({ key, label: dayLabel(event.occurred_at, locale, t), events: [event] })
    }
    return groups
  }, [])

  useEffect(() => {
    if (addNote.isError) {
      form.setFocus('body')
    }
  }, [addNote.isError, form])

  async function submitNote(values: TimelineNoteFormValues) {
    setNoteAdded(false)
    try {
      await addNote.mutateAsync(values.body)
      form.reset()
      setNoteAdded(true)
      setNoteComposerOpen(false)
    } catch {
      // The mutation state drives the error message and restores focus after re-render.
    }
  }

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={t('crm.companies.timeline.title')}
      aria-busy={timeline.isPending || timeline.isFetchingNextPage}
      sx={{ overflow: 'hidden', minWidth: 0 }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2.5,
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography component="h2" variant="h6">
            {t('crm.companies.timeline.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.companies.timeline.description')}
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', xl: 'block' }, maxWidth: '100%' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={category ?? 'all'}
            aria-label={t('crm.companies.timeline.filterAria')}
            onChange={(_, value: 'all' | CompanyTimelineCategory | null) => {
              if (value) setCategory(value === 'all' ? undefined : value)
            }}
          >
            {filters.map((filter) => (
              <ToggleButton key={filter} value={filter} sx={{ whiteSpace: 'nowrap' }}>
                {t(`crm.companies.timeline.filters.${filter}`)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <TextField
          select
          size="small"
          label={t('crm.companies.timeline.filterLabel')}
          value={category ?? 'all'}
          onChange={(event) => {
            const value = event.target.value as 'all' | CompanyTimelineCategory
            setCategory(value === 'all' ? undefined : value)
          }}
          sx={{ display: { xs: 'flex', xl: 'none' }, minWidth: { sm: 200 } }}
        >
          {filters.map((filter) => (
            <MenuItem key={filter} value={filter}>
              {t(`crm.companies.timeline.filters.${filter}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {canManage ? (
        <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack
            direction="row"
            useFlexGap
            sx={{ px: { xs: 2, sm: 3 }, py: 1.5, flexWrap: 'wrap', gap: 1 }}
          >
            <Button
              variant={noteComposerOpen ? 'contained' : 'text'}
              startIcon={<NotesRounded />}
              onClick={() => {
                setNoteAdded(false)
                setNoteComposerOpen(true)
              }}
              sx={{ minHeight: 44 }}
            >
              {t('crm.companies.timeline.addNote')}
            </Button>
            <Button
              startIcon={<AddTaskRounded />}
              onClick={() => setTaskDrawerOpen(true)}
              sx={{ minHeight: 44 }}
            >
              {t('crm.companies.timeline.addNextAction')}
            </Button>
          </Stack>
          {noteComposerOpen ? (
            <Box
              component="form"
              onSubmit={form.handleSubmit(submitNote)}
              sx={{ borderTop: 1, borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 2 }}
            >
              <Controller
                name="body"
                control={form.control}
                render={({ field: { ref, ...field }, fieldState }) => (
                  <TextField
                    {...field}
                    inputRef={ref}
                    autoFocus
                    fullWidth
                    multiline
                    minRows={2}
                    label={t('crm.companies.timeline.addNote')}
                    placeholder={t('crm.companies.timeline.notePlaceholder')}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error
                        ? t('crm.companies.timeline.noteRequired')
                        : t('crm.companies.timeline.noteHint')
                    }
                    disabled={addNote.isPending}
                  />
                )}
              />
              {addNote.isError ? (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {addNote.error.message}
                </Alert>
              ) : null}
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
                <Button
                  onClick={() => {
                    form.reset()
                    addNote.reset()
                    setNoteComposerOpen(false)
                  }}
                  disabled={addNote.isPending}
                  sx={{ minHeight: 44 }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={addNote.isPending}
                  sx={{ minHeight: 44 }}
                >
                  {addNote.isPending
                    ? t('crm.companies.timeline.addingNote')
                    : t('crm.companies.timeline.addNoteAction')}
                </Button>
              </Stack>
            </Box>
          ) : null}
        </Box>
      ) : null}
      <Box aria-live="polite" sx={{ px: { xs: 2, sm: 3 }, pt: noteAdded ? 2 : 0 }}>
        {noteAdded ? (
          <Alert severity="success">{t('crm.companies.timeline.noteSuccess')}</Alert>
        ) : null}
      </Box>

      {timeline.isPending ? <CompanyTimelineLoading /> : null}
      {timeline.isError ? (
        <Box sx={{ p: 3 }}>
          <Failure error={timeline.error} retry={() => void timeline.refetch()} />
        </Box>
      ) : null}
      {timeline.isSuccess && events.length === 0 ? (
        <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>{t('crm.companies.timeline.emptyTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {category
              ? t('crm.companies.timeline.emptyFiltered')
              : t('crm.companies.timeline.emptyDescription')}
          </Typography>
          {category ? (
            <Button onClick={() => setCategory(undefined)} sx={{ mt: 1.5 }}>
              {t('crm.companies.timeline.clearFilter')}
            </Button>
          ) : null}
        </Box>
      ) : null}
      {timeline.isSuccess && events.length > 0 ? (
        <Stack>
          {groupedEvents.map((group) => (
            <Box component="section" key={group.key} aria-labelledby={`timeline-day-${group.key}`}>
              <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.25, bgcolor: 'action.hover' }}>
                <Typography
                  id={`timeline-day-${group.key}`}
                  component="h3"
                  variant="overline"
                  color="text.secondary"
                >
                  {group.label}
                </Typography>
              </Box>
              <Stack component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {group.events.map((event) => {
                  const copy = eventCopy(event, t, locale)
                  const exactTime = new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(event.occurred_at))
                  return (
                    <Box
                      component="li"
                      key={event.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '32px minmax(0, 1fr)',
                        columnGap: { xs: 1.5, sm: 2 },
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        alignItems: 'start',
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Box
                        aria-hidden="true"
                        sx={{
                          width: 32,
                          height: 32,
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
                          <Typography
                            sx={{ mt: 0.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                          >
                            {event.body}
                          </Typography>
                        ) : null}
                        {copy.detail ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {copy.detail}
                          </Typography>
                        ) : null}
                        <Typography
                          component="time"
                          dateTime={event.occurred_at}
                          title={exactTime}
                          aria-label={`${event.actor_name} · ${exactTime}`}
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.75 }}
                        >
                          {event.actor_name} · {relativeTime(event.occurred_at, locale)}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : null}
      {timeline.isSuccess && events.length > 0 && timeline.hasNextPage ? (
        <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
          <Button
            onClick={() => void timeline.fetchNextPage()}
            disabled={timeline.isFetchingNextPage}
          >
            {timeline.isFetchingNextPage
              ? t('common.loading')
              : t('crm.companies.timeline.loadEarlier')}
          </Button>
        </Box>
      ) : null}
      {taskDrawerOpen ? (
        <TaskDrawer
          organizationId={organizationId}
          companies={[company]}
          initialCompanyId={company.id}
          onSaved={() => void timeline.refetch()}
          onClose={() => setTaskDrawerOpen(false)}
        />
      ) : null}
    </Paper>
  )
}
