import bell from '@iconify-icons/keyline-icons/bell'
import calendar from '@iconify-icons/keyline-icons/calendar'
import clock from '@iconify-icons/keyline-icons/clock'
import creditCard from '@iconify-icons/keyline-icons/credit-card'
import users from '@iconify-icons/keyline-icons/users'
import type { IconifyIcon } from '@iconify/react'
import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import { Failure } from '../../../components/common/Feedback'
import type { SubscriptionOverview } from '../../../types/subscription.types'

import { Surface, TextLink } from '../DashboardComponents'

interface BillingAttentionSectionProps {
  organizationId: string
  overview: SubscriptionOverview | undefined
  isPending: boolean
  error: Error | null
  retry: () => void
  canManagePeople: boolean
  pendingInvitationCount: number
}

export function BillingAttentionSection({
  organizationId,
  overview,
  isPending,
  error,
  retry,
  canManagePeople,
  pendingInvitationCount,
}: BillingAttentionSectionProps) {
  const { t } = useTranslation()
  const attentionItems: Array<{ label: string; value: number; icon: IconifyIcon }> = [
    {
      label: t('crm.dashboard.overdueCharges'),
      value: overview?.overdue_charges ?? 0,
      icon: creditCard,
    },
    {
      label: t('crm.dashboard.renewals'),
      value: overview?.renewals_next_30_days ?? 0,
      icon: calendar,
    },
    {
      label: t('crm.dashboard.scheduledCancellations'),
      value: overview?.scheduled_cancellations ?? 0,
      icon: clock,
    },
  ]

  return (
    <Surface
      component="section"
      aria-labelledby="attention-heading"
      sx={{ p: { xs: 2.5, md: 3 }, order: { xs: 2, lg: 1 } }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography id="attention-heading" component="h2" variant="h4">
          {t('crm.dashboard.attention')}
        </Typography>
        <AppIcon icon={bell} size={22} />
      </Stack>
      {isPending ? (
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="rounded" height={58} />
          ))}
        </Stack>
      ) : error ? (
        <Box sx={{ mt: 2 }}>
          <Failure error={error} retry={retry} />
        </Box>
      ) : (
        <Stack sx={{ mt: 2 }}>
          {attentionItems.map(({ label, value, icon }) => (
            <Stack
              key={String(label)}
              direction="row"
              sx={{
                minHeight: 64,
                alignItems: 'center',
                gap: 1.5,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  width: 36,
                  height: 36,
                  placeItems: 'center',
                  borderRadius: 1.25,
                  bgcolor: 'action.hover',
                  color: 'text.secondary',
                }}
              >
                <AppIcon icon={icon} size={19} />
              </Box>
              <Typography sx={{ flex: 1 }} color="text.secondary">
                {label}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
      <Box sx={{ mt: 1 }}>
        <TextLink
          to="/organizations/$organizationId/services/billing"
          organizationId={organizationId}
        >
          {t('crm.dashboard.billingLink')}
        </TextLink>
      </Box>
      {canManagePeople && pendingInvitationCount ? (
        <Box sx={{ mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.5 }}>
            <AppIcon icon={users} size={21} />
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h3" sx={{ fontWeight: 750 }}>
                {t('crm.dashboard.invitations')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t('crm.dashboard.pendingInvitationCount', {
                  count: pendingInvitationCount,
                })}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <TextLink
                  to="/organizations/$organizationId/members"
                  organizationId={organizationId}
                >
                  {t('crm.dashboard.manageInvitations')}
                </TextLink>
              </Box>
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Surface>
  )
}
