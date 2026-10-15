import { Box, Divider, Link, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { Company } from '../../../types/company.types'

function Detail({ label, value, empty }: { label: string; value?: string; empty: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.35, wordBreak: 'break-word' }}>
        {value || empty}
      </Typography>
    </Box>
  )
}

export function CompanyProfileContent({ company }: { company: Company }) {
  const { t } = useTranslation()
  const address = [
    company.address_line_1,
    company.address_line_2,
    [company.postal_code, company.city].filter(Boolean).join(' '),
    company.country,
  ].filter(Boolean)

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          {t('crm.companies.profileContent.contactDetails')}
        </Typography>
        <Stack spacing={1.5}>
          <Detail
            label={t('crm.companies.profileContent.email')}
            value={company.email}
            empty={t('crm.companies.profileContent.emptyValue')}
          />
          <Detail
            label={t('crm.companies.profileContent.phone')}
            value={company.phone_number}
            empty={t('crm.companies.profileContent.emptyValue')}
          />
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('crm.companies.profileContent.website')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.35 }}>
              {company.website ? (
                <Link href={company.website} target="_blank" rel="noreferrer">
                  {company.website}
                </Link>
              ) : (
                t('crm.companies.profileContent.emptyValue')
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          {t('crm.companies.profileContent.businessDetails')}
        </Typography>
        <Stack spacing={1.5}>
          <Detail
            label={t('crm.companies.profileContent.customerCode')}
            value={company.customer_code}
            empty={t('crm.companies.profileContent.emptyValue')}
          />
          <Detail
            label={t('crm.companies.profileContent.accountOwner')}
            value={company.assigned_to_name || t('crm.companies.unassigned')}
            empty={t('crm.companies.profileContent.emptyValue')}
          />
          <Detail
            label={t('crm.companies.profileContent.taxId')}
            value={company.tax_id}
            empty={t('crm.companies.profileContent.emptyValue')}
          />
          <Detail
            label={t('crm.companies.profileContent.industry')}
            value={company.industry}
            empty={t('crm.companies.profileContent.emptyValue')}
          />
          <Detail
            label={t('crm.companies.profileContent.address')}
            value={address.join(', ')}
            empty={t('crm.companies.profileContent.emptyValue')}
          />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          {t('crm.companies.profileContent.internalNotes')}
        </Typography>
        <Typography variant="body2" color={company.notes ? 'text.primary' : 'text.secondary'}>
          {company.notes || t('crm.companies.profileContent.noNotes')}
        </Typography>
      </Box>
    </Stack>
  )
}
