import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Failure, Loading } from '../../../components/common/Feedback'
import type { CustomerSubscription, SubscriptionStatus } from '../../../types/subscription.types'

function subscriptionStatusColor(status: SubscriptionStatus): 'success' | 'warning' | 'default' {
  if (status === 'active') {
    return 'success'
  }
  if (status === 'cancelling') {
    return 'warning'
  }
  return 'default'
}

interface CompanyServicesPanelProps {
  organizationId: string
  subscriptions: CustomerSubscription[]
  locale: string
  pending: boolean
  error: Error | null
  onRetry: () => void
}

export function CompanyServicesPanel({
  organizationId,
  subscriptions,
  locale,
  pending,
  error,
  onRetry,
}: CompanyServicesPanelProps) {
  const { t } = useTranslation()
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          px: 3,
          py: 2.5,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography component="h2" variant="h6">
            {t('crm.companies.detail.servicesTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.companies.detail.servicesDescription')}
          </Typography>
        </Box>
        <Link to="/organizations/$organizationId/services" params={{ organizationId }}>
          <Button component="span">{t('crm.companies.detail.openBilling')}</Button>
        </Link>
      </Stack>
      <Divider />
      {pending ? (
        <Loading />
      ) : error ? (
        <Box sx={{ p: 3 }}>
          <Failure error={error} retry={onRetry} />
        </Box>
      ) : subscriptions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
          {t('crm.companies.detail.noServices')}
        </Typography>
      ) : (
        <Stack divider={<Divider />}>
          {subscriptions.map((subscription) => (
            <Stack
              key={subscription.id}
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ px: 3, py: 2.25, justifyContent: 'space-between', gap: 1 }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{subscription.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {subscription.effective_status === 'cancelling' &&
                  subscription.cancellation_effective_date
                    ? t('crm.companies.detail.activeThrough', {
                        date: date.format(new Date(subscription.cancellation_effective_date)),
                      })
                    : t('crm.companies.detail.nextCharge', {
                        date: date.format(new Date(subscription.next_billing_date)),
                      })}{' '}
                  · {t(`crm.companies.detail.billingIntervals.${subscription.billing_interval}`)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={t(
                    `crm.companies.detail.subscriptionStatuses.${subscription.effective_status}`,
                  )}
                  color={subscriptionStatusColor(subscription.effective_status)}
                />
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {Number(subscription.gross_price).toLocaleString(locale, {
                    minimumFractionDigits: 2,
                  })}{' '}
                  {subscription.currency}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  )
}
