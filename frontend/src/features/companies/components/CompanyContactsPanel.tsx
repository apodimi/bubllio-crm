import mailIcon from '@iconify-icons/keyline-icons/mail'
import phoneIcon from '@iconify-icons/keyline-icons/phone'
import { Box, Divider, Link, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import { Failure, Loading } from '../../../components/common/Feedback'
import type { Contact } from '../../../types/contact.types'

interface CompanyContactsPanelProps {
  contacts: Contact[]
  pending: boolean
  error: Error | null
  onRetry: () => void
}

export function CompanyContactsPanel({
  contacts,
  pending,
  error,
  onRetry,
}: CompanyContactsPanelProps) {
  const { t } = useTranslation()

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography component="h2" variant="h6">
          {t('crm.companies.detail.contactsTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('crm.companies.detail.contactsDescription')}
        </Typography>
      </Box>
      <Divider />
      {pending ? (
        <Box sx={{ p: 3 }}>
          <Loading />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3 }}>
          <Failure error={error} retry={onRetry} />
        </Box>
      ) : contacts.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t('crm.companies.detail.noContacts')}
          </Typography>
        </Box>
      ) : (
        <Stack divider={<Divider />}>
          {contacts.map((contact) => (
            <Box key={contact.id} sx={{ px: 3, py: 2.25 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[contact.job_title, contact.department].filter(Boolean).join(' · ') ||
                  t('crm.companies.detail.contactFallback')}
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                {contact.email ? (
                  <Link
                    href={`mailto:${contact.email}`}
                    variant="body2"
                    underline="hover"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                  >
                    <AppIcon icon={mailIcon} size={16} /> {contact.email}
                  </Link>
                ) : null}
                {contact.phone_number ? (
                  <Link
                    href={`tel:${contact.phone_number}`}
                    variant="body2"
                    underline="hover"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                  >
                    <AppIcon icon={phoneIcon} size={16} /> {contact.phone_number}
                  </Link>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  )
}
