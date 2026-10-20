import arrowLeftIcon from '@iconify-icons/keyline-icons/arrow-left'
import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { Failure, Loading } from '../../components/common/Feedback'
import { OperationalTabs } from '../../components/common/OperationalTabs'
import { useArchiveCompany, useCompany, useRestoreCompany } from '../../features/companies'
import { CompanyContactsPanel } from '../../features/companies/components/CompanyContactsPanel'
import { CompanyDialog } from '../../features/companies/components/CompanyDialog'
import { CompanyProfileContent } from '../../features/companies/components/CompanyProfileContent'
import { CompanyProfileHeader } from '../../features/companies/components/CompanyProfileHeader'
import { CompanyServicesPanel } from '../../features/companies/components/CompanyServicesPanel'
import { CompanySnapshot } from '../../features/companies/components/CompanySnapshot'
import { CompanyTimeline } from '../../features/companies/components/CompanyTimeline'
import { useContacts } from '../../features/contacts'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useSubscriptions } from '../../features/subscriptions'

type CompanyProfileTab = 'timeline' | 'overview' | 'contacts' | 'services'

function contactName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(' ')
}

function snapshotValue(
  error: boolean,
  value: string | undefined,
  unavailable: string,
  empty: string,
) {
  if (error) {
    return unavailable
  }
  return value || empty
}

export function CompanyDetailPage() {
  const { t, i18n } = useTranslation()
  const organization = useWorkspace()
  const { companyId } = useParams({
    from: '/organizations/$organizationId/companies/$companyId',
  })
  const company = useCompany(organization.id, companyId)
  const resolvedCompanyId = company.data?.id ?? ''
  const contacts = useContacts(
    organization.id,
    { company: resolvedCompanyId },
    Boolean(resolvedCompanyId),
  )
  const subscriptions = useSubscriptions(organization.id)
  const archive = useArchiveCompany(organization.id)
  const restore = useRestoreCompany(organization.id)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<CompanyProfileTab>('overview')

  if (company.isPending) {
    return <Loading />
  }
  if (company.isError) {
    return <Failure error={company.error} retry={() => void company.refetch()} />
  }

  const record = company.data
  const companyContacts = contacts.data ?? []
  const canManage = canCreateRecords(organization)
  const companySubscriptions = (subscriptions.data ?? []).filter(
    (subscription) => subscription.company === record.id,
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
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const unavailable = t('crm.companies.detail.snapshot.unavailable')
  const emptySnapshot = t('crm.companies.detail.snapshot.none')
  const primaryContactValue = snapshotValue(
    contacts.isError,
    primaryContact ? contactName(primaryContact.first_name, primaryContact.last_name) : undefined,
    unavailable,
    emptySnapshot,
  )
  const activeServicesValue = snapshotValue(
    subscriptions.isError,
    String(activeSubscriptions.length),
    unavailable,
    emptySnapshot,
  )
  const nextBillingValue = snapshotValue(
    subscriptions.isError,
    nextBillingDate ? date.format(new Date(nextBillingDate)) : undefined,
    unavailable,
    emptySnapshot,
  )

  return (
    <>
      <Link
        to="/organizations/$organizationId/companies"
        params={{ organizationId: organization.id }}
        search={{ company: undefined }}
      >
        <Button component="span" startIcon={<AppIcon icon={arrowLeftIcon} />} sx={{ mb: 2 }}>
          {t('crm.companies.detail.back')}
        </Button>
      </Link>
      {record.archived_at ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('crm.companies.detail.archivedNotice')}
        </Alert>
      ) : null}
      <CompanyProfileHeader
        company={record}
        locale={locale}
        canManage={canManage}
        archivePending={archive.isPending || restore.isPending}
        onEdit={() => setEditing(true)}
        onToggleArchived={() => {
          if (record.archived_at) {
            restore.mutate(companyId)
          } else {
            archive.mutate(companyId)
          }
        }}
      />

      <Box sx={{ mb: 3 }}>
        <CompanySnapshot
          owner={record.assigned_to_name || t('crm.companies.unassigned')}
          primaryContact={primaryContactValue}
          activeServices={activeServicesValue}
          nextBilling={nextBillingValue}
          contactsPending={contacts.isPending}
          contactsError={contacts.isError}
          subscriptionsPending={subscriptions.isPending}
          subscriptionsError={subscriptions.isError}
        />
      </Box>

      <OperationalTabs
        label={t('crm.companies.detail.tabs.label')}
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: 'overview', label: t('crm.companies.detail.tabs.overview') },
          { value: 'timeline', label: t('crm.companies.detail.tabs.timeline') },
          {
            value: 'contacts',
            label: t('crm.companies.detail.tabs.contacts', { count: companyContacts.length }),
          },
          {
            value: 'services',
            label: t('crm.companies.detail.tabs.services', {
              count: companySubscriptions.length,
            }),
          },
        ]}
      />

      <Box sx={{ minWidth: 0 }}>
        {activeTab === 'overview' ? (
          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography component="h2" variant="h6" sx={{ mb: 3 }}>
              {t('crm.companies.detail.profileTitle')}
            </Typography>
            <CompanyProfileContent company={record} />
          </Paper>
        ) : null}
        {activeTab === 'timeline' ? (
          <CompanyTimeline
            organizationId={organization.id}
            company={record}
            canManage={canManage}
          />
        ) : null}
        {activeTab === 'contacts' ? (
          <CompanyContactsPanel
            contacts={companyContacts}
            pending={contacts.isPending}
            error={contacts.error}
            onRetry={() => void contacts.refetch()}
          />
        ) : null}
        {activeTab === 'services' ? (
          <CompanyServicesPanel
            organizationId={organization.id}
            subscriptions={companySubscriptions}
            locale={locale}
            pending={subscriptions.isPending}
            error={subscriptions.error}
            onRetry={() => void subscriptions.refetch()}
          />
        ) : null}
      </Box>

      {editing ? (
        <CompanyDialog
          organizationId={organization.id}
          company={record}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  )
}
