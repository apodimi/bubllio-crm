import type { TFunction } from 'i18next'

import type { CompanyTimelineEvent } from '../../../types/company.types'

export type TimelineTranslator = TFunction

export interface TimelineDayGroup {
  key: string
  label: string
  events: CompanyTimelineEvent[]
}

const contactEventKeys = {
  'contact.created': 'crm.companies.timeline.events.contactAdded',
  'contact.updated': 'crm.companies.timeline.events.contactUpdated',
  'contact.assigned': 'crm.companies.timeline.events.contactOwnerChanged',
  'contact.archived': 'crm.companies.timeline.events.contactArchived',
  'contact.restored': 'crm.companies.timeline.events.contactRestored',
} as const

const dealEventKeys = {
  'deal.created': 'crm.companies.timeline.events.dealAdded',
  'deal.updated': 'crm.companies.timeline.events.dealUpdated',
  'deal.archived': 'crm.companies.timeline.events.dealArchived',
  'deal.restored': 'crm.companies.timeline.events.dealRestored',
} as const

const taskEventKeys = {
  'task.created': 'crm.companies.timeline.events.taskAdded',
  'task.updated': 'crm.companies.timeline.events.taskUpdated',
  'task.completed': 'crm.companies.timeline.events.taskCompleted',
  'task.reopened': 'crm.companies.timeline.events.taskReopened',
} as const

type NamedEventTranslationKey =
  | (typeof contactEventKeys)[keyof typeof contactEventKeys]
  | (typeof dealEventKeys)[keyof typeof dealEventKeys]
  | (typeof taskEventKeys)[keyof typeof taskEventKeys]
  | 'crm.companies.timeline.events.dealMoved'
  | 'crm.companies.timeline.events.taskStatusChanged'
  | 'crm.companies.timeline.events.serviceStarted'
  | 'crm.companies.timeline.events.serviceUpdated'
  | 'crm.companies.timeline.events.serviceStatusChanged'

type NamedEventFallbackKey =
  | 'crm.companies.detail.contactFallback'
  | 'crm.companies.timeline.dealFallback'
  | 'crm.companies.timeline.taskFallback'
  | 'crm.companies.timeline.serviceFallback'

function humanize(value = '') {
  return value.replaceAll('_', ' ')
}

export function translateTimelineValue(value: string | undefined, t: TimelineTranslator) {
  const translations: Record<string, string> = {
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

  return translations[value ?? ''] ?? humanize(value)
}

export function translateTimelineField(field: string, t: TimelineTranslator) {
  const translations: Record<string, string> = {
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

  return translations[field] ?? humanize(field)
}

function namedEvent(
  translationKey: NamedEventTranslationKey,
  name: string | undefined,
  fallbackKey: NamedEventFallbackKey,
  t: TimelineTranslator,
) {
  return {
    title: t(translationKey, { name: name ?? t(fallbackKey) }),
  }
}

export function getTimelineEventCopy(
  event: CompanyTimelineEvent,
  t: TimelineTranslator,
  locale: string,
): { title: string; detail?: string } {
  const details = event.details

  switch (event.event_type) {
    case 'company.created':
      return { title: t('crm.companies.timeline.events.companyAdded') }
    case 'company.updated':
      return {
        title: t('crm.companies.timeline.events.companyUpdated'),
        detail: details.fields?.map((field) => translateTimelineField(field, t)).join(', '),
      }
    case 'company.assigned':
      return { title: t('crm.companies.timeline.events.ownerChanged') }
    case 'company.archived':
      return { title: t('crm.companies.timeline.events.companyArchived') }
    case 'company.restored':
      return { title: t('crm.companies.timeline.events.companyRestored') }
    case 'contact.created':
    case 'contact.updated':
    case 'contact.assigned':
    case 'contact.archived':
    case 'contact.restored': {
      return namedEvent(
        contactEventKeys[event.event_type as keyof typeof contactEventKeys],
        details.contact_name,
        'crm.companies.detail.contactFallback',
        t,
      )
    }
    case 'deal.created':
    case 'deal.updated':
    case 'deal.archived':
    case 'deal.restored': {
      return namedEvent(
        dealEventKeys[event.event_type as keyof typeof dealEventKeys],
        details.deal_title,
        'crm.companies.timeline.dealFallback',
        t,
      )
    }
    case 'deal.stage_changed':
      return {
        ...namedEvent(
          'crm.companies.timeline.events.dealMoved',
          details.deal_title,
          'crm.companies.timeline.dealFallback',
          t,
        ),
        detail: t('crm.companies.timeline.transition', {
          from: translateTimelineValue(details.from_stage, t),
          to: translateTimelineValue(details.to_stage, t),
        }),
      }
    case 'task.created':
    case 'task.updated':
    case 'task.completed':
    case 'task.reopened': {
      return namedEvent(
        taskEventKeys[event.event_type as keyof typeof taskEventKeys],
        details.task_title,
        'crm.companies.timeline.taskFallback',
        t,
      )
    }
    case 'task.status_changed':
      return {
        ...namedEvent(
          'crm.companies.timeline.events.taskStatusChanged',
          details.task_title,
          'crm.companies.timeline.taskFallback',
          t,
        ),
        detail: t('crm.companies.timeline.transition', {
          from: translateTimelineValue(details.from_status, t),
          to: translateTimelineValue(details.to_status, t),
        }),
      }
    case 'service.created':
    case 'service.updated': {
      const key = event.event_type === 'service.created' ? 'serviceStarted' : 'serviceUpdated'
      return namedEvent(
        `crm.companies.timeline.events.${key}`,
        details.subscription_name,
        'crm.companies.timeline.serviceFallback',
        t,
      )
    }
    case 'service.status_changed':
      return {
        ...namedEvent(
          'crm.companies.timeline.events.serviceStatusChanged',
          details.subscription_name,
          'crm.companies.timeline.serviceFallback',
          t,
        ),
        detail: translateTimelineValue(details.to_status, t),
      }
    case 'payment.recorded': {
      const amount = Number(details.amount)
      const formattedAmount = Number.isFinite(amount)
        ? amount.toLocaleString(locale, {
            style: 'currency',
            currency: details.currency ?? 'EUR',
          })
        : details.amount
      return {
        title: formattedAmount
          ? t('crm.companies.timeline.events.paymentRecorded', { amount: formattedAmount })
          : t('crm.companies.timeline.events.paymentRecordedNoAmount'),
        detail: details.subscription_name,
      }
    }
    case 'note.added':
      return { title: t('crm.companies.timeline.events.noteAdded') }
    case 'communication.logged': {
      const kinds: Record<string, string> = {
        call: t('crm.companies.timeline.communication.call'),
        email: t('crm.companies.timeline.communication.email'),
        meeting: t('crm.companies.timeline.communication.meeting'),
      }
      const kind = details.kind ?? 'call'
      return {
        title: t('crm.companies.timeline.events.communicationLogged', {
          kind: kinds[kind] ?? humanize(kind),
          outcome: details.outcome,
        }),
        detail: details.contact_name,
      }
    }
    default:
      return { title: t('crm.companies.timeline.events.unknown') }
  }
}

export function getTimelineDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function getTimelineDayLabel(
  value: string,
  locale: string,
  t: TimelineTranslator,
  now = new Date(),
) {
  const date = new Date(value)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (getTimelineDayKey(date) === getTimelineDayKey(now)) {
    return t('crm.companies.timeline.today')
  }
  if (getTimelineDayKey(date) === getTimelineDayKey(yesterday)) {
    return t('crm.companies.timeline.yesterday')
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
}

export function getTimelineRelativeTime(value: string, locale: string, now = new Date()) {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
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

export function groupTimelineEvents(
  events: CompanyTimelineEvent[],
  locale: string,
  t: TimelineTranslator,
  now = new Date(),
) {
  return events.reduce<TimelineDayGroup[]>((groups, event) => {
    const key = getTimelineDayKey(event.occurred_at)
    const currentGroup = groups.at(-1)
    if (currentGroup?.key === key) {
      currentGroup.events.push(event)
      return groups
    }

    groups.push({
      key,
      label: getTimelineDayLabel(event.occurred_at, locale, t, now),
      events: [event],
    })
    return groups
  }, [])
}
