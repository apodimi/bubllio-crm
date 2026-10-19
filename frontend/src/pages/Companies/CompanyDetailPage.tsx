import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import LanguageRounded from '@mui/icons-material/LanguageRounded'
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
  Skeleton,
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

function websiteHref(website: string) {
  if (/^https?:\/\//i.test(website)) {
    return website
  }
  return `https://${website}`
}

function SnapshotValue({
  label,
  value,
  pending,
  error,
}: {
  label: string
  value: string
  pending?: boolean
  error?: boolean
}) {
  return (
    <Box sx={{ minWidth: 0, px: { xs: 2, sm: 2.5 }, py: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {pending ? (
        <Skeleton width="70%" />
      ) : (
        <Typography
          variant="body2"
          color={error ? 'error.main' : 'text.primary'}
          sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
        >
          {value}
        </Typography>
      )}
    </Box>
  )
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
  const primaryContact = companyContacts.find((contact) => contact.is_primary)
  const activeSubscriptions = companySubscriptions.filter((subscription) =>
    ['active', 'cancelling'].includes(subscription.effective_status),
  )
  const nextBillingDate = activeSubscriptions
    .map((subscription) => subscription.next_billing_date)
    .filter(Boolean)
    .sort()[0]
  const locale = i18n.resolvedLanguage ?? i18n.language

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
        <Box sx={{ minWidth: 0 }}>
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
          <Typography component="h1" variant="h3" sx={{ overflowWrap: 'anywhere' }}>
            {company.data.name}
          </Typography>
          <Stack direction="row" useFlexGap spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
            {company.data.email ? (
              <MuiLink href={`mailto:${company.data.email}`} variant="body2" underline="hover">
                <MailOutlineRounded sx={{ fontSize: 17, mr: 0.75, verticalAlign: 'text-bottom' }} />
                {company.data.email}
              </MuiLink>
            ) : null}
            {company.data.phone_number ? (
              <MuiLink href={`tel:${company.data.phone_number}`} variant="body2" underline="hover">
                <PhoneOutlined sx={{ fontSize: 17, mr: 0.75, verticalAlign: 'text-bottom' }} />
                {company.data.phone_number}
              </MuiLink>
            ) : null}
            {company.data.website ? (
              <MuiLink
                href={websiteHref(company.data.website)}
                target="_blank"
                rel="noreferrer"
                variant="body2"
                underline="hover"
              >
                <LanguageRounded sx={{ fontSize: 17, mr: 0.75, verticalAlign: 'text-bottom' }} />
                {company.data.website}
              </MuiLink>
            ) : null}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('crm.companies.detail.addedUpdated', {
              added: formatDate(company.data.created_at, locale),
              updated: formatDate(company.data.updated_at, locale),
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

      <Box component="section" aria-labelledby="customer-snapshot-heading" sx={{ mb: 3 }}>
        <Typography id="customer-snapshot-heading" component="h2" variant="h6" sx={{ mb: 1.5 }}>
          {t('crm.companies.detail.snapshotTitle')}
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' },
            '& > *:not(:nth-of-type(2n + 1))': { borderLeft: { xs: 1, md: 0 } },
            '& > *:not(:first-of-type)': { borderLeft: { md: 1 } },
            '& > *:nth-of-type(n + 3)': { borderTop: { xs: 1, md: 0 } },
            '& > *': { borderColor: 'divider' },
          }}
        >
          <SnapshotValue
            label={t('crm.companies.detail.snapshot.owner')}
            value={company.data.assigned_to_name || t('crm.companies.unassigned')}
          />
          <SnapshotValue
            label={t('crm.companies.detail.snapshot.primaryContact')}
            value={
              contacts.isError
                ? t('crm.companies.detail.snapshot.unavailable')
                : primaryContact
                  ? [primaryContact.first_name, primaryContact.last_name].filter(Boolean).join(' ')
                  : t('crm.companies.detail.snapshot.none')
            }
            pending={contacts.isPending}
            error={contacts.isError}
          />
          <SnapshotValue
            label={t('crm.companies.detail.snapshot.activeServices')}
            value={
              subscriptions.isError
                ? t('crm.companies.detail.snapshot.unavailable')
                : String(activeSubscriptions.length)
            }
            pending={subscriptions.isPending}
            error={subscriptions.isError}
          />
          <SnapshotValue
            label={t('crm.companies.detail.snapshot.nextBilling')}
            value={
              subscriptions.isError
                ? t('crm.companies.detail.snapshot.unavailable')
                : nextBillingDate
                  ? formatDate(nextBillingDate, locale)
                  : t('crm.companies.detail.snapshot.none')
            }
            pending={subscriptions.isPending}
            error={subscriptions.isError}
          />
        </Paper>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <CompanyTimeline
          organizationId={organization.id}
          company={company.data}
          canManage={canManage}
        />

        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography component="h2" variant="h6" sx={{ mb: 3 }}>
              {t('crm.companies.detail.profileTitle')}
            </Typography>
            <CompanyProfileContent company={company.data} />
          </Paper>

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
                              date: formatDate(subscription.cancellation_effective_date, locale),
                            })
                          : t('crm.companies.detail.nextCharge', {
                              date: formatDate(subscription.next_billing_date, locale),
                            })}{' '}
                        ·{' '}
                        {t(
                          `crm.companies.detail.billingIntervals.${subscription.billing_interval}`,
                        )}
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
        </Stack>
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
