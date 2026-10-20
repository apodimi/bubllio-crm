import { type ReactNode } from 'react'
import { Badge } from '@mui/material'

import type { ActivityInboxItem } from '../../types/activityInbox.types'

type ActivityInboxIndicatorProps = {
  count: number
  items?: ActivityInboxItem[]
  children: ReactNode
}

export function ActivityInboxIndicator({
  count,
  items = [],
  children,
}: ActivityInboxIndicatorProps) {
  const hasOnlyCriticalItems =
    items.length > 0 && items.every((item) => item.severity === 'critical')

  return (
    <Badge color={hasOnlyCriticalItems ? 'error' : 'primary'} badgeContent={count} max={99}>
      {children}
    </Badge>
  )
}
