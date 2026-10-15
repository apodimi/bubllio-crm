import { zodResolver } from '@hookform/resolvers/zod'
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
import type { TFunction } from 'i18next'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Failure } from '../../../components/common/Feedback'
import type { CompanyTimelineCategory, CompanyTimelineEvent } from '../../../types/company.types'
import { timelineNoteSchema, type TimelineNoteFormValues } from '../companySchema'
import { useAddCompanyTimelineNote, useCompanyTimeline } from '../hooks/useCompanies'

const filters: Array<'all' | CompanyTimelineCategory> = [
  'all',
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
        title: t('crm.companies.timeline.events.unknown', {
          event: humanize(event.event_type),
        }),
      }
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
  const { t, i18n } = useTranslation()
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
          <Typography variant="h6">{t('crm.companies.timeline.title')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.companies.timeline.description')}
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: '100%' }}>
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
          sx={{ display: { xs: 'flex', sm: 'none' } }}
        >
          {filters.map((filter) => (
            <MenuItem key={filter} value={filter}>
              {t(`crm.companies.timeline.filters.${filter}`)}
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
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
            <Button type="submit" variant="contained" disabled={addNote.isPending}>
              {addNote.isPending
                ? t('crm.companies.timeline.addingNote')
                : t('crm.companies.timeline.addNoteAction')}
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
          <Typography sx={{ fontWeight: 700 }}>{t('crm.companies.timeline.emptyTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {category
              ? t('crm.companies.timeline.emptyFiltered')
              : t('crm.companies.timeline.emptyDescription')}
          </Typography>
        </Box>
      ) : null}
      {timeline.isSuccess && events.length > 0 ? (
        <Stack divider={<Divider />}>
          {events.map((event) => {
            const locale = i18n.resolvedLanguage ?? i18n.language
            const copy = eventCopy(event, t, locale)
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
                  {new Intl.DateTimeFormat(locale, {
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
                {timeline.isFetchingNextPage
                  ? t('common.loading')
                  : t('crm.companies.timeline.loadEarlier')}
              </Button>
            </Box>
          ) : null}
        </Stack>
      ) : null}
    </Paper>
  )
}
