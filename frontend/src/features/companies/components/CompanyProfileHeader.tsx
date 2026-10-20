import archiveIcon from '@iconify-icons/keyline-icons/archive'
import globeIcon from '@iconify-icons/keyline-icons/globe'
import mailIcon from '@iconify-icons/keyline-icons/mail'
import penIcon from '@iconify-icons/keyline-icons/pen'
import phoneIcon from '@iconify-icons/keyline-icons/phone'
import restoreIcon from '@iconify-icons/keyline-icons/rotate-ccw'
import { Box, Button, Chip, Link as MuiLink, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import type { Company } from '../../../types/company.types'

function websiteHref(website: string) {
  if (/^https?:\/\//i.test(website)) {
    return website
  }
  return `https://${website}`
}

interface CompanyProfileHeaderProps {
  company: Company
  locale: string
  canManage: boolean
  archivePending: boolean
  onEdit: () => void
  onToggleArchived: () => void
}

export function CompanyProfileHeader({
  company,
  locale,
  canManage,
  archivePending,
  onEdit,
  onToggleArchived,
}: CompanyProfileHeaderProps) {
  const { t } = useTranslation()
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={3}
      sx={{
        mb: 4,
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'flex-start' },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Chip
            size="small"
            label={t(`crm.companies.stages.${company.lifecycle_stage}`)}
            color="primary"
            variant="outlined"
          />
          {company.industry ? (
            <Typography variant="body2" color="text.secondary">
              {company.industry}
            </Typography>
          ) : null}
        </Stack>
        <Typography component="h1" variant="h3" sx={{ overflowWrap: 'anywhere' }}>
          {company.name}
        </Typography>
        <Stack direction="row" useFlexGap spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          {company.email ? (
            <MuiLink
              href={`mailto:${company.email}`}
              variant="body2"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
            >
              <AppIcon icon={mailIcon} size={17} /> {company.email}
            </MuiLink>
          ) : null}
          {company.phone_number ? (
            <MuiLink
              href={`tel:${company.phone_number}`}
              variant="body2"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
            >
              <AppIcon icon={phoneIcon} size={17} /> {company.phone_number}
            </MuiLink>
          ) : null}
          {company.website ? (
            <MuiLink
              href={websiteHref(company.website)}
              target="_blank"
              rel="noreferrer"
              variant="body2"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
            >
              <AppIcon icon={globeIcon} size={17} /> {company.website}
            </MuiLink>
          ) : null}
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t('crm.companies.detail.addedUpdated', {
            added: date.format(new Date(company.created_at)),
            updated: date.format(new Date(company.updated_at)),
          })}
        </Typography>
      </Box>
      {canManage ? (
        <Stack direction="row" spacing={1.25}>
          <Button variant="contained" startIcon={<AppIcon icon={penIcon} />} onClick={onEdit}>
            {t('crm.companies.edit')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AppIcon icon={company.archived_at ? restoreIcon : archiveIcon} />}
            disabled={archivePending}
            onClick={onToggleArchived}
          >
            {company.archived_at
              ? t('crm.companies.detail.restore')
              : t('crm.companies.detail.archive')}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  )
}
