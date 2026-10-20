import briefcaseIcon from '@iconify-icons/keyline-icons/briefcase'
import buildingIcon from '@iconify-icons/keyline-icons/building'
import creditCardIcon from '@iconify-icons/keyline-icons/credit-card'
import fileTextIcon from '@iconify-icons/keyline-icons/file-text'
import listCheckIcon from '@iconify-icons/keyline-icons/list-check'
import packageIcon from '@iconify-icons/keyline-icons/package'
import phoneIcon from '@iconify-icons/keyline-icons/phone'
import userIcon from '@iconify-icons/keyline-icons/user'
import { Box, Stack, Typography } from '@mui/material'
import type { IconifyIcon } from '@iconify/react'

import { AppIcon } from '../../../components/common/AppIcon'
import type { CompanyTimelineCategory } from '../../../types/company.types'

import {
  getTimelineEventCopy,
  getTimelineRelativeTime,
  type TimelineTranslator,
  type TimelineDayGroup,
} from './CompanyTimelineFormatters'

const categoryIcons: Record<CompanyTimelineCategory, IconifyIcon> = {
  company: buildingIcon,
  contact: userIcon,
  deal: briefcaseIcon,
  task: listCheckIcon,
  service: packageIcon,
  payment: creditCardIcon,
  note: fileTextIcon,
  communication: phoneIcon,
}

export function CompanyTimelineEventList({
  groups,
  locale,
  t,
}: {
  groups: TimelineDayGroup[]
  locale: string
  t: TimelineTranslator
}) {
  return (
    <Stack>
      {groups.map((group) => (
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
              const copy = getTimelineEventCopy(event, t, locale)
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
                      borderRadius: 1,
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                    }}
                  >
                    <AppIcon icon={categoryIcons[event.category]} size={18} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
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
                      {event.actor_name} · {getTimelineRelativeTime(event.occurred_at, locale)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}
