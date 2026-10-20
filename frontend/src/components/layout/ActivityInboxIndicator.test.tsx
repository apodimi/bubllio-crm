// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { ActivityInboxItem } from '../../types/activityInbox.types'

import { ActivityInboxIndicator } from './ActivityInboxIndicator'

afterEach(cleanup)

function inboxItem(severity: ActivityInboxItem['severity']): ActivityInboxItem {
  return {
    id: severity,
    kind: 'overdue_task',
    severity,
    title: 'Follow up',
    description: 'Call the customer',
    entity: { type: 'task', id: 'task-1' },
    due_at: '2026-10-20T09:00:00Z',
    action: { kind: 'navigate', path: '/tasks/task-1' },
  }
}

describe('ActivityInboxIndicator', () => {
  it('uses the error badge when every item is critical', () => {
    render(
      <ActivityInboxIndicator count={2} items={[inboxItem('critical'), inboxItem('critical')]}>
        <span>Inbox</span>
      </ActivityInboxIndicator>,
    )

    expect(screen.getByText('2').className).toContain('MuiBadge-colorError')
  })

  it('uses the primary badge for mixed severity items', () => {
    render(
      <ActivityInboxIndicator count={2} items={[inboxItem('critical'), inboxItem('warning')]}>
        <span>Inbox</span>
      </ActivityInboxIndicator>,
    )

    expect(screen.getByText('2').className).toContain('MuiBadge-colorPrimary')
  })
})
