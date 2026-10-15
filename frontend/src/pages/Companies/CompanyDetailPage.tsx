import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded'
import PhoneOutlined from '@mui/icons-material/PhoneOutlined'
import RestoreRounded from '@mui/icons-material/RestoreRounded'
import {
  Box,
  Button,
  Chip,
  Divider,
  Link as MuiLink,
  Paper,
  Alert,
  Stack,
  Typography,
} from '@mui/material'
import { Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Failure, Loading } from '../../components/common/Feedback'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useArchiveCompany, useCompany, useRestoreCompany } from '../../features/companies'
import { CompanyDialog } from '../../features/companies/components/CompanyDialog'
import { CompanyProfileContent } from '../../features/companies/components/CompanyProfileContent'
import { CompanyTimeline } from '../../features/companies/components/CompanyTimeline'
import { useContacts } from '../../features/contacts'
import { useSubscriptions } from '../../features/subscriptions'
import type { SubscriptionStatus } from '../../types/subscription.types'

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
}

function subscriptionStatusColor(status: SubscriptionStatus): 'success' | 'warning' | 'default' {
  if (status === 'active') {
    return 'success'
  }
  if (status === 'cancelling') {
    return 'warning'
  }
  return 'default'
}

export function CompanyDetailPage() {
  const { t, i18n } = useTranslation()
  const organization = useWorkspace()
  const { companyId } = useParams({
    from: '/organizations/$organizationId/companies/$companyId',
  })
  const company = useCompany(organization.id, companyId)
  const contacts = useContacts(organization.id, { company: company.data?.id ?? '' })
  const subscriptions = useSubscriptions(organization.id)
  const archive = useArchiveCompany(organization.id)
  const restore = useRestoreCompany(organization.id)
  const [editing, setEditing] = useState(false)

  if (company.isPending) return <Loading />
  if (company.isError) return <Failure error={company.error} retry={() => void company.refetch()} />

  const companyContacts = contacts.data ?? []
  const canManage = canCreateRecords(organization)
  const companySubscriptions = (subscriptions.data ?? []).filter(
    (subscription) => subscription.company === company.data.id,
  )

  return (
    <>
      <Link
        to="/organizations/$organizationId/companies"
        params={{ organizationId: organization.id }}
        search={{ company: undefined }}
      >
        <Button component="span" startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>
          {t('crm.companies.detail.back')}
        </Button>
      </Link>
      {company.data.archived_at ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('crm.companies.detail.archivedNotice')}
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{
          mb: 4,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <Chip
              size="small"
              label={t(`crm.companies.stages.${company.data.lifecycle_stage}`)}
              color="primary"
              variant="outlined"
            />
            {company.data.industry ? (
              <Typography variant="body2" color="text.secondary">
                {company.data.industry}
              </Typography>
            ) : null}
          </Stack>
          <Typography variant="h3">{company.data.name}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('crm.companies.detail.addedUpdated', {
              added: formatDate(company.data.created_at, i18n.resolvedLanguage ?? i18n.language),
              updated: formatDate(company.data.updated_at, i18n.resolvedLanguage ?? i18n.language),
            })}
          </Typography>
        </Box>
        {canManage ? (
          <Stack direction="row" spacing={1.25}>
            <Button
              variant="contained"
              startIcon={<EditRounded />}
              onClick={() => setEditing(true)}
            >
              {t('crm.companies.edit')}
            </Button>
            <Button
              variant="outlined"
              startIcon={company.data.archived_at ? <RestoreRounded /> : <ArchiveOutlined />}
              disabled={archive.isPending || restore.isPending}
              onClick={() =>
                company.data.archived_at ? restore.mutate(companyId) : archive.mutate(companyId)
              }
            >
              {company.data.archived_at
                ? t('crm.companies.detail.restore')
                : t('crm.companies.detail.archive')}
            </Button>
          </Stack>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(320px, .65fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            {t('crm.companies.detail.profileTitle')}
          </Typography>
          <CompanyProfileContent company={company.data} />
        </Paper>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="h6">{t('crm.companies.detail.contactsTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('crm.companies.detail.contactsDescription')}
            </Typography>
          </Box>
          <Divider />
          {contacts.isPending ? (
            <Box sx={{ p: 3 }}>
              <Loading />
            </Box>
          ) : contacts.isError ? (
            <Box sx={{ p: 3 }}>
              <Failure error={contacts.error} retry={() => void contacts.refetch()} />
            </Box>
          ) : companyContacts.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('crm.companies.detail.noContacts')}
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {companyContacts.map((contact) => (
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
                      <MuiLink href={`mailto:${contact.email}`} variant="body2" underline="hover">
                        <MailOutlineRounded
                          sx={{ fontSize: 16, mr: 0.75, verticalAlign: 'text-bottom' }}
                        />
                        {contact.email}
                      </MuiLink>
                    ) : null}
                    {contact.phone_number ? (
                      <MuiLink
                        href={`tel:${contact.phone_number}`}
                        variant="body2"
                        underline="hover"
                      >
                        <PhoneOutlined
                          sx={{ fontSize: 16, mr: 0.75, verticalAlign: 'text-bottom' }}
                        />
                        {contact.phone_number}
                      </MuiLink>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ overflow: 'hidden', gridColumn: { lg: '1 / -1' } }}>
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
              <Typography variant="h6">{t('crm.companies.detail.servicesTitle')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('crm.companies.detail.servicesDescription')}
              </Typography>
            </Box>
            <Link
              to="/organizations/$organizationId/services"
              params={{ organizationId: organization.id }}
            >
              <Button component="span">{t('crm.companies.detail.openBilling')}</Button>
            </Link>
          </Stack>
          <Divider />
          {subscriptions.isPending ? (
            <Loading />
          ) : subscriptions.isError ? (
            <Box sx={{ p: 3 }}>
              <Failure error={subscriptions.error} retry={() => void subscriptions.refetch()} />
            </Box>
          ) : companySubscriptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
              {t('crm.companies.detail.noServices')}
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {companySubscriptions.map((subscription) => (
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
                            date: formatDate(
                              subscription.cancellation_effective_date,
                              i18n.resolvedLanguage ?? i18n.language,
                            ),
                          })
                        : t('crm.companies.detail.nextCharge', {
                            date: formatDate(
                              subscription.next_billing_date,
                              i18n.resolvedLanguage ?? i18n.language,
                            ),
                          })}{' '}
                      ·{' '}
                      {t(`crm.companies.detail.billingIntervals.${subscription.billing_interval}`)}
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
                      {Number(subscription.gross_price).toLocaleString(
                        i18n.resolvedLanguage ?? i18n.language,
                        {
                          minimumFractionDigits: 2,
                        },
                      )}{' '}
                      {subscription.currency}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
        <CompanyTimeline
          organizationId={organization.id}
          companyId={companyId}
          canManage={canManage}
        />
      </Box>

      {editing ? (
        <CompanyDialog
          organizationId={organization.id}
          company={company.data}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  )
}
