import { Box, Button, Skeleton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Failure } from '../../../components/common/Feedback'
import type { Company, CompanyAttentionItem } from '../../../types/company.types'

import { Surface } from '../DashboardComponents'

export interface CustomersAttentionViewModel {
  items: CompanyAttentionItem[] | null | undefined
  isPending: boolean
  error: Error | null
  retry: () => void
}

interface CustomersAttentionSectionProps {
  canManage: boolean
  attention: CustomersAttentionViewModel
  onLogCommunication: (company: Company) => void
  onAddFollowUp: (company: Company) => void
}

export function CustomersAttentionSection({
  canManage,
  attention,
  onLogCommunication,
  onAddFollowUp,
}: CustomersAttentionSectionProps) {
  const { t, i18n } = useTranslation()

  return (
    <Surface
      component="section"
      aria-labelledby="customers-to-contact-heading"
      sx={{ overflow: 'hidden' }}
    >
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography id="customers-to-contact-heading" component="h2" variant="h4">
          {t('crm.dashboard.customersToContact')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {t('crm.dashboard.customersToContactDescription')}
        </Typography>
      </Box>
      {attention.items === null ? (
        <Box sx={{ px: 2.5, py: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 750 }}>
            {t('crm.dashboard.attentionUpgradeTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.dashboard.attentionUpgradeDescription')}
          </Typography>
        </Box>
      ) : attention.isPending ? (
        <Stack spacing={0.5} sx={{ p: 2 }}>
          {[0, 1].map((item) => (
            <Skeleton key={item} variant="rounded" height={76} />
          ))}
        </Stack>
      ) : attention.error ? (
        <Box sx={{ p: 2 }}>
          <Failure error={attention.error} retry={attention.retry} />
        </Box>
      ) : attention.items?.length ? (
        attention.items.map((item) => (
          <Stack
            key={item.company.id}
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 1.5,
              gap: 1.5,
              alignItems: { sm: 'center' },
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 750 }}>{item.company.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {item.last_communication_at
                  ? t('crm.dashboard.lastContact', {
                      date: new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'medium',
                      }).format(new Date(item.last_communication_at)),
                    })
                  : t('crm.dashboard.neverContacted')}
              </Typography>
            </Box>
            {canManage ? (
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" onClick={() => onLogCommunication(item.company)}>
                  {t('crm.dashboard.logCommunication')}
                </Button>
                <Button size="small" variant="outlined" onClick={() => onAddFollowUp(item.company)}>
                  {t('crm.dashboard.addFollowUp')}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        ))
      ) : (
        <Typography
          color="text.secondary"
          sx={{ px: 2.5, py: 3, borderTop: 1, borderColor: 'divider' }}
        >
          {t('crm.dashboard.noCustomersToContact')}
        </Typography>
      )}
    </Surface>
  )
}
