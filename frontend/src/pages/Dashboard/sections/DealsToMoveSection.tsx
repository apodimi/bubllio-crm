import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Failure } from '../../../components/common/Feedback'
import { OperationalTabs } from '../../../components/common/OperationalTabs'
import type { Deal } from '../../../types/deal.types'

import { Surface, TextLink } from '../DashboardComponents'

export type DashboardDealView = 'no_next_action' | 'closing_this_month'

export interface DealsToMoveViewModel {
  items: Deal[] | undefined
  isPending: boolean
  error: Error | null
  retry: () => void
}

interface DealsToMoveSectionProps {
  organizationId: string
  value: DashboardDealView
  deals: DealsToMoveViewModel
  onChange: (value: DashboardDealView) => void
}

export function DealsToMoveSection({
  organizationId,
  value,
  deals,
  onChange,
}: DealsToMoveSectionProps) {
  const { t, i18n } = useTranslation()

  return (
    <Surface
      component="section"
      aria-labelledby="deals-to-move-heading"
      sx={{ overflow: 'hidden', order: { xs: 1, lg: 2 } }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          p: { xs: 2, sm: 2.5 },
          gap: 1.5,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Typography id="deals-to-move-heading" component="h2" variant="h4">
          {t('crm.dashboard.dealsToMove')}
        </Typography>
        <OperationalTabs
          value={value}
          onChange={onChange}
          label={t('crm.dashboard.dealsToMove')}
          divider={false}
          options={[
            {
              value: 'no_next_action',
              label: t('crm.dashboard.missingNextAction'),
            },
            {
              value: 'closing_this_month',
              label: t('crm.dashboard.closingThisMonth'),
            },
          ]}
        />
      </Stack>
      {deals.isPending ? (
        <Stack spacing={1} sx={{ p: 2 }}>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} height={52} />
          ))}
        </Stack>
      ) : deals.error ? (
        <Box sx={{ p: 2 }}>
          <Failure error={deals.error} retry={deals.retry} />
        </Box>
      ) : deals.items?.length ? (
        deals.items.slice(0, 5).map((deal) => (
          <Box
            key={deal.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0,1fr)',
                sm: 'minmax(0,1.6fr) minmax(0,1fr) auto auto',
              },
              gap: { xs: 0.25, sm: 2 },
              px: { xs: 2, sm: 2.5 },
              py: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              alignItems: 'center',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 750 }} noWrap>
                {deal.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {deal.company_name}
              </Typography>
            </Box>
            <Typography variant="body2">
              {new Intl.NumberFormat(i18n.language, {
                style: 'currency',
                currency: deal.currency,
                maximumFractionDigits: 0,
              }).format(Number(deal.net_value))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {deal.expected_close_date
                ? new Intl.DateTimeFormat(i18n.language).format(
                    new Date(`${deal.expected_close_date}T00:00:00`),
                  )
                : '—'}
            </Typography>
            <Box>
              <TextLink
                to="/organizations/$organizationId/deals/$dealId"
                organizationId={organizationId}
                dealId={deal.id}
              >
                {t('crm.dashboard.openDeal')}
              </TextLink>
            </Box>
          </Box>
        ))
      ) : (
        <Typography
          color="text.secondary"
          sx={{ px: 2.5, py: 3, borderTop: 1, borderColor: 'divider' }}
        >
          {t('crm.dashboard.noDealsToMove')}
        </Typography>
      )}
      <Box sx={{ px: 2.5, borderTop: 1, borderColor: 'divider' }}>
        <TextLink
          to="/organizations/$organizationId/deals"
          organizationId={organizationId}
          search={{ view: value }}
        >
          {t('crm.dashboard.viewDeals')}
        </TextLink>
      </Box>
    </Surface>
  )
}
