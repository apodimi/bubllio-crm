import { describe, expect, it } from 'vitest'

import type { CompanyTimelineEvent } from '../../../types/company.types'

import {
  getTimelineDayLabel,
  getTimelineEventCopy,
  getTimelineRelativeTime,
  groupTimelineEvents,
  type TimelineTranslator,
  translateTimelineField,
  translateTimelineValue,
} from './CompanyTimelineFormatters'

const t = ((key: string, options?: Record<string, unknown>) => {
  if (!options) {
    return key
  }
  return `${key}:${JSON.stringify(options)}`
}) as unknown as TimelineTranslator

function event(
  eventType: string,
  details: CompanyTimelineEvent['details'] = {},
  occurredAt = '2026-10-20T12:00:00.000Z',
): CompanyTimelineEvent {
  return {
    id: eventType,
    category: eventType.split('.')[0] as CompanyTimelineEvent['category'],
    event_type: eventType,
    source_type: '',
    source_id: null,
    actor_name: 'Demo',
    body: '',
    details,
    occurred_at: occurredAt,
  }
}

describe('getTimelineEventCopy', () => {
  it.each([
    ['company.created', 'companyAdded'],
    ['company.updated', 'companyUpdated'],
    ['company.assigned', 'ownerChanged'],
    ['company.archived', 'companyArchived'],
    ['company.restored', 'companyRestored'],
    ['contact.created', 'contactAdded'],
    ['contact.updated', 'contactUpdated'],
    ['contact.assigned', 'contactOwnerChanged'],
    ['contact.archived', 'contactArchived'],
    ['contact.restored', 'contactRestored'],
    ['deal.created', 'dealAdded'],
    ['deal.updated', 'dealUpdated'],
    ['deal.stage_changed', 'dealMoved'],
    ['deal.archived', 'dealArchived'],
    ['deal.restored', 'dealRestored'],
    ['task.created', 'taskAdded'],
    ['task.updated', 'taskUpdated'],
    ['task.completed', 'taskCompleted'],
    ['task.reopened', 'taskReopened'],
    ['task.status_changed', 'taskStatusChanged'],
    ['service.created', 'serviceStarted'],
    ['service.updated', 'serviceUpdated'],
    ['service.status_changed', 'serviceStatusChanged'],
    ['note.added', 'noteAdded'],
    ['communication.logged', 'communicationLogged'],
  ])('maps %s to its existing translation', (eventType, translation) => {
    const copy = getTimelineEventCopy(event(eventType), t, 'en-US')

    expect(copy.title).toContain(`crm.companies.timeline.events.${translation}`)
  })

  it('translates changed fields and transition values', () => {
    const companyCopy = getTimelineEventCopy(
      event('company.updated', { fields: ['phone_number', 'custom_field'] }),
      t,
      'en-US',
    )
    const dealCopy = getTimelineEventCopy(
      event('deal.stage_changed', { from_stage: 'lead', to_stage: 'custom_stage' }),
      t,
      'en-US',
    )

    expect(companyCopy.detail).toBe('crm.companies.profileContent.phone, custom field')
    expect(dealCopy.detail).toContain('crm.companies.timeline.values.lead')
    expect(dealCopy.detail).toContain('custom stage')
  })

  it('formats valid payments for the requested locale', () => {
    const copy = getTimelineEventCopy(
      event('payment.recorded', { amount: '1234.5', currency: 'EUR' }),
      t,
      'de-DE',
    )

    expect(copy.title).toContain('1.234,50 €')
  })

  it('preserves an invalid payment amount instead of fabricating a number', () => {
    const copy = getTimelineEventCopy(
      event('payment.recorded', { amount: 'pending', currency: 'EUR' }),
      t,
      'en-US',
    )

    expect(copy.title).toContain('pending')
  })

  it('uses the unknown event copy for unsupported event types', () => {
    expect(getTimelineEventCopy(event('company.mystery'), t, 'en-US')).toEqual({
      title: 'crm.companies.timeline.events.unknown',
    })
  })
})

describe('timeline field and value translation', () => {
  it('translates known values and humanizes unknown values', () => {
    expect(translateTimelineValue('in_progress', t)).toBe(
      'crm.companies.timeline.values.inProgress',
    )
    expect(translateTimelineValue('needs_review', t)).toBe('needs review')
  })

  it('translates known fields and humanizes unknown fields', () => {
    expect(translateTimelineField('tax_id', t)).toBe('crm.companies.profileContent.taxId')
    expect(translateTimelineField('custom_field', t)).toBe('custom field')
  })
})

describe('timeline dates', () => {
  const now = new Date('2026-10-20T12:00:00.000Z')

  it('labels today and yesterday using injected time', () => {
    expect(getTimelineDayLabel('2026-10-20T08:00:00.000Z', 'en-US', t, now)).toBe(
      'crm.companies.timeline.today',
    )
    expect(getTimelineDayLabel('2026-10-19T08:00:00.000Z', 'en-US', t, now)).toBe(
      'crm.companies.timeline.yesterday',
    )
  })

  it('formats older dates using the requested locale', () => {
    expect(getTimelineDayLabel('2026-10-18T08:00:00.000Z', 'el-GR', t, now)).toContain('Οκτωβρίου')
  })

  it('calculates relative time using injected time and locale', () => {
    expect(getTimelineRelativeTime('2026-10-20T11:55:00.000Z', 'en-US', now)).toBe('5 minutes ago')
    expect(getTimelineRelativeTime('2026-10-20T11:00:00.000Z', 'el-GR', now)).toContain('ώρα')
  })

  it('groups consecutive events by local calendar day', () => {
    const groups = groupTimelineEvents(
      [
        event('note.added', {}, '2026-10-20T12:00:00.000Z'),
        event('task.created', {}, '2026-10-20T08:00:00.000Z'),
        event('deal.created', {}, '2026-10-19T08:00:00.000Z'),
      ],
      'en-US',
      t,
      now,
    )

    expect(groups).toHaveLength(2)
    expect(groups[0].events).toHaveLength(2)
    expect(groups[1].label).toBe('crm.companies.timeline.yesterday')
  })
})
